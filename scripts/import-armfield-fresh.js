import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const ARMFIELD_LOCATION_NAME = 'Armfield House';

async function parseCSV() {
  const csvPath = path.join(process.cwd(), 'training-data', 'Armfield House.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  
  const records = parse(content, {
    columns: false,
    skip_empty_lines: false,
    relax_quotes: true,
  });

  return records;
}

function parseDate(dateStr) {
  if (!dateStr || dateStr === '' || dateStr === 'N/A') {
    return { date: null, status: null };
  }

  const lowerStr = dateStr.toLowerCase().trim();

  // Check for special status values first
  if (lowerStr.includes('booked') || lowerStr === 'booked') {
    return { date: null, status: 'Booked' };
  }
  if (lowerStr.includes('awaiting') || lowerStr === 'awaiting training') {
    return { date: null, status: 'Awaiting Training' };
  }
  if (lowerStr.includes('in progress') || lowerStr === 'in progress') {
    return { date: null, status: 'In progress' };
  }
  if (lowerStr.includes('not yet due') || lowerStr === 'not yet due' || lowerStr === 'not due yet') {
    return { date: null, status: 'not yet due' };
  }
  if (lowerStr.includes('n/a') || lowerStr === 'n/a') {
    return { date: null, status: 'N/A' };
  }

  // Parse date in DD/MM/YYYY format
  try {
    // First, clean up the string - remove newlines and extra spaces
    const cleanStr = dateStr.trim().replace(/\s+/g, '');
    const parts = cleanStr.split('/');
    if (parts.length !== 3) return { date: null, status: null };

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year) || day < 1 || day > 31 || month < 1 || month > 12) {
      return { date: null, status: null };
    }

    // Create date in UTC
    const date = new Date(year, month - 1, day);
    
    // Validate the date
    if (date.getDate() !== day || date.getMonth() !== month - 1) {
      return { date: null, status: null };
    }

    return { date: date.toISOString().split('T')[0], status: 'completed' };
  } catch (error) {
    return { date: null, status: null };
  }
}

async function deleteOldData() {
  console.log('Deleting old Armfield House training records...');
  const { error } = await supabase
    .from('staff_training_matrix')
    .delete()
    .eq('completed_at_location_id', '62dca354-f597-4c7a-96f5-6a9308eafb35');
  
  if (error) {
    console.error('Error deleting old data:', error);
  } else {
    console.log('Old data deleted successfully\n');
  }
}

async function importArmfieldDates() {
  try {
    console.log('Parsing CSV...');
    const records = await parseCSV();

    // Find the row with "Staff Name" header
    let headerRowIndex = -1;
    for (let i = 0; i < records.length; i++) {
      if (records[i][0] && records[i][0].includes('Staff Name')) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      console.error('Could not find "Staff Name" header row in CSV');
      process.exit(1);
    }

    console.log(`Found header row at index ${headerRowIndex}`);

    // Extract course information from the header row
    const headerRow = records[headerRowIndex];
    const courses = [];
    const courseMap = {};
    
    for (let i = 1; i < headerRow.length; i++) {
      const courseName = headerRow[i];
      if (courseName && courseName.trim() && courseName.trim() !== 'Notes') {
        courseMap[i] = courseName.trim();
        if (!courses.find(c => c.name === courseName.trim())) {
          courses.push({
            index: i,
            name: courseName.trim(),
          });
        }
      }
    }

    console.log(`Found ${courses.length} courses`);

    // Get location ID
    const { data: locations } = await supabase
      .from('locations')
      .select('id')
      .eq('name', ARMFIELD_LOCATION_NAME);

    if (!locations || locations.length === 0) {
      console.error(`Location "${ARMFIELD_LOCATION_NAME}" not found in database`);
      process.exit(1);
    }

    const locationId = locations[0].id;
    console.log(`Using location: ${ARMFIELD_LOCATION_NAME}`);

    // Build course name to ID map from existing courses
    console.log('Building course map...');
    const courseIdMap = {};
    
    for (const course of courses) {
      const { data: existing } = await supabase
        .from('courses')
        .select('id')
        .eq('name', course.name);

      if (existing && existing.length > 0) {
        courseIdMap[course.name] = existing[0].id;
      }
    }

    console.log(`Mapped ${Object.keys(courseIdMap).length} courses\n`);

    // Process staff and training records
    console.log('Importing training dates...');
    let staffCount = 0;
    let trainingCount = 0;
    let emptyCount = 0;
    let statusOnlyCount = 0;
    let dateOnlyCount = 0;
    let skippedStaff = 0;

    // Start from the row after the header
    for (let rowIndex = headerRowIndex + 1; rowIndex < records.length; rowIndex++) {
      const row = records[rowIndex];
      const staffName = row[0];

      // Skip empty rows
      if (!staffName || !staffName.trim()) {
        continue;
      }

      // Skip role divider rows (these are section headers)
      if (
        staffName.toLowerCase().includes('management') ||
        staffName.toLowerCase().includes('team leader') ||
        staffName.toLowerCase().includes('lead support') ||
        staffName.toLowerCase().includes('staff team') ||
        staffName.toLowerCase().includes('staff on probation') ||
        staffName.toLowerCase().includes('inactive staff') ||
        staffName.toLowerCase().includes('notes') ||
        staffName.toLowerCase().includes('date valid for')
      ) {
        continue;
      }

      // Find staff member
      const { data: staffMembers } = await supabase
        .from('profiles')
        .select('id')
        .eq('full_name', staffName.trim())
        .eq('is_deleted', false);

      if (!staffMembers || staffMembers.length === 0) {
        skippedStaff++;
        continue;
      }

      const staffId = staffMembers[0].id;
      staffCount++;

      // Process training records for each course
      for (let colIndex = 1; colIndex < row.length; colIndex++) {
        const cellValue = row[colIndex];
        const courseName = courseMap[colIndex];

        if (!courseName || !courseIdMap[courseName]) {
          continue;
        }

        const courseId = courseIdMap[courseName];
        const { date, status } = parseDate(cellValue);

        // Only insert if there's a date or status
        if (date || status) {
          try {
            const completionDate = date || new Date().toISOString().split('T')[0];
            
            // Calculate expiry date: completion_date + 12 months (default)
            const completionDateObj = new Date(completionDate);
            const expiryDateObj = new Date(completionDateObj);
            expiryDateObj.setMonth(expiryDateObj.getMonth() + 12);
            const expiryDate = expiryDateObj.toISOString().split('T')[0];
            
            const { data, error } = await supabase
              .from('staff_training_matrix')
              .upsert(
                {
                  staff_id: staffId,
                  course_id: courseId,
                  completion_date: completionDate,
                  expiry_date: expiryDate,
                  status: status || 'completed',
                  completed_at_location_id: locationId,
                },
                { onConflict: 'staff_id,course_id' }
              )
              .select();

            if (!error && data && data.length > 0) {
              trainingCount++;
              if (date && status) {
                // Both
              } else if (status) {
                statusOnlyCount++;
              } else if (date) {
                dateOnlyCount++;
              }
            } else if (error) {
              console.error(`Error saving training for ${staffName.trim()} - ${courseName}:`, error.message);
            }
          } catch (e) {
            console.error(`Exception saving training for ${staffName.trim()} - ${courseName}:`, e.message);
          }
        } else {
          emptyCount++;
        }
      }
    }

    console.log(`\n✅ Import Complete!`);
    console.log(`Staff processed: ${staffCount}`);
    console.log(`Training records imported: ${trainingCount}`);
    console.log(`  - Date + Status: ${trainingCount - statusOnlyCount - dateOnlyCount}`);
    console.log(`  - Date only: ${dateOnlyCount}`);
    console.log(`  - Status only: ${statusOnlyCount}`);
    console.log(`Empty cells skipped: ${emptyCount}`);
    console.log(`Staff skipped (not found): ${skippedStaff}`);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the import
(async () => {
  await deleteOldData();
  await importArmfieldDates();
})();
