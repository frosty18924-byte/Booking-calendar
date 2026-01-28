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

  // Check for special status values
  if (lowerStr.includes('booked')) {
    return { date: null, status: 'booked' };
  }
  if (lowerStr.includes('awaiting')) {
    return { date: null, status: 'awaiting_training' };
  }
  if (lowerStr.includes('in progress')) {
    return { date: null, status: 'in_progress' };
  }
  if (lowerStr.includes('not yet due')) {
    return { date: null, status: 'not_due_yet' };
  }
  if (lowerStr.includes('completed')) {
    return { date: null, status: 'completed_status' };
  }

  // Parse date in DD/MM/YYYY format
  try {
    const parts = dateStr.trim().split('/');
    if (parts.length !== 3) return { date: null, status: null };

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return { date: null, status: null };

    const date = new Date(year, month - 1, day);
    
    if (date.getDate() !== day || date.getMonth() !== month - 1) {
      return { date: null, status: null };
    }

    return { date: date.toISOString().split('T')[0], status: null };
  } catch (error) {
    return { date: null, status: null };
  }
}

async function importArmfieldData() {
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
    const seenCourses = new Set();
    
    for (let i = 1; i < headerRow.length; i++) {
      const courseName = headerRow[i];
      if (courseName && courseName.trim() && courseName.trim() !== 'Notes' && !seenCourses.has(courseName.trim())) {
        seenCourses.add(courseName.trim());
        courses.push({
          index: i,
          name: courseName.trim(),
          expiryMonths: 24,
        });
      }
    }

    console.log(`Found ${courses.length} courses`);

    // Get or create location
    let locationId;
    const { data: locations } = await supabase
      .from('locations')
      .select('id')
      .eq('name', ARMFIELD_LOCATION_NAME);

    if (locations && locations.length > 0) {
      locationId = locations[0].id;
      console.log(`Using existing location: ${ARMFIELD_LOCATION_NAME}`);
    } else {
      const { data: newLocation, error: locError } = await supabase
        .from('locations')
        .insert([{ name: ARMFIELD_LOCATION_NAME }])
        .select('id')
        .single();

      if (locError) {
        console.error('Error creating location:', locError);
        process.exit(1);
      }

      locationId = newLocation.id;
      console.log(`Created new location: ${ARMFIELD_LOCATION_NAME}`);
    }

    // Ensure all courses exist in the database
    console.log('Ensuring courses exist in database...');
    const courseIdMap = {};
    
    for (const course of courses) {
      const { data: existing } = await supabase
        .from('courses')
        .select('id')
        .eq('name', course.name);

      if (existing && existing.length > 0) {
        courseIdMap[course.name] = existing[0].id;
      } else {
        const { data: newCourse, error: courseError } = await supabase
          .from('courses')
          .insert([
            {
              name: course.name,
              expiry_months: course.expiryMonths,
              is_core: true,
              display_order: courses.indexOf(course) + 1,
            },
          ])
          .select('id')
          .single();

        if (courseError) {
          console.error(`Error creating course ${course.name}:`, courseError);
          continue;
        }

        courseIdMap[course.name] = newCourse.id;
      }
    }

    console.log(`Linked ${Object.keys(courseIdMap).length} courses`);

    // Link courses to location
    console.log('Linking courses to location...');
    for (let i = 0; i < courses.length; i++) {
      const courseId = courseIdMap[courses[i].name];
      if (!courseId) continue;

      const { data: existing } = await supabase
        .from('location_courses')
        .select('id')
        .eq('location_id', locationId)
        .eq('course_id', courseId);

      if (!existing || existing.length === 0) {
        await supabase.from('location_courses').insert([
          {
            location_id: locationId,
            course_id: courseId,
            display_order: i,
            is_required: true,
          },
        ]);
      }
    }

    console.log('Courses linked');

    // Collect all staff and training data first
    console.log('Collecting staff and training data...');
    const staffMap = new Map(); // Map staff name to { id, trainingRecords }
    const trainingsToInsert = [];
    let staffCount = 0;
    let trainingCount = 0;

    for (let rowIndex = headerRowIndex + 1; rowIndex < records.length; rowIndex++) {
      const row = records[rowIndex];
      const staffName = row[0];

      if (!staffName || !staffName.trim()) continue;

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

      const { data: existingStaffList } = await supabase
        .from('profiles')
        .select('id')
        .eq('full_name', staffName.trim());

      let staffId;
      if (existingStaffList && existingStaffList.length > 0) {
        staffId = existingStaffList[0].id;
      } else {
        const { data: newStaff, error: staffError } = await supabase
          .from('profiles')
          .insert([
            {
              full_name: staffName.trim(),
              email: `${staffName.trim().toLowerCase().replace(/\s+/g, '.')}@armfield.local`,
              location: ARMFIELD_LOCATION_NAME,
            },
          ])
          .select('id')
          .single();

        if (staffError) {
          console.error(`Error creating staff ${staffName.trim()}:`, staffError);
          continue;
        }

        staffId = newStaff.id;
        staffCount++;
      }

      // Link staff to location
      const { data: staffLocList } = await supabase
        .from('staff_locations')
        .select('id')
        .eq('staff_id', staffId)
        .eq('location_id', locationId);

      if (!staffLocList || staffLocList.length === 0) {
        await supabase.from('staff_locations').insert([
          {
            staff_id: staffId,
            location_id: locationId,
          },
        ]);
      }

      // Collect training records for this staff (only those with actual dates)
      for (const course of courses) {
        const { date: completionDate, status } = parseDate(row[course.index]);

        // Only import records with actual completion dates, skip status-only records
        if (completionDate) {
          const courseId = courseIdMap[course.name];
          if (!courseId) continue;

          let expiryDate = null;
          const completion = new Date(completionDate);
          const expiry = new Date(completion);
          expiry.setMonth(expiry.getMonth() + course.expiryMonths);
          expiryDate = expiry.toISOString().split('T')[0];

          trainingsToInsert.push({
            staff_id: staffId,
            course_id: courseId,
            completion_date: completionDate,
            expiry_date: expiryDate,
            completed_at_location_id: locationId,
            status: 'completed',
          });
          trainingCount++;
        }
      }
    }

    // Batch insert training records
    console.log(`Inserting ${trainingsToInsert.length} training records...`);
    const BATCH_SIZE = 100;
    for (let i = 0; i < trainingsToInsert.length; i += BATCH_SIZE) {
      const batch = trainingsToInsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('staff_training_matrix')
        .insert(batch, { returning: 'minimal' });

      if (error) {
        console.error(`Error inserting batch at ${i}:`, error);
      }
      if (i % 500 === 0) {
        console.log(`  Processed ${Math.min(i + BATCH_SIZE, trainingsToInsert.length)} records...`);
      }
    }

    console.log(`\n✅ Import completed!`);
    console.log(`Staff created: ${staffCount}`);
    console.log(`Training records imported: ${trainingCount}`);

  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

importArmfieldData();
