#!/usr/bin/env node

/**
 * CSV to Supabase Training Matrix Import
 * 
 * Imports training data from CSV files (exported from Google Sheets) to Supabase
 */

require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Add to .env.local:');
  console.error('  SUPABASE_URL=your-url');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse CSV file - handle quoted fields with newlines
function parseCSV(csvContent) {
  const rows = [];
  let current = '';
  let inQuotes = false;
  let values = [];

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      values.push(current.trim());
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // Line separator (only if not in quotes)
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \r\n
      }
      if (current.trim() || values.length > 0) {
        values.push(current.trim());
        rows.push(values);
        values = [];
        current = '';
      }
    } else {
      current += char;
    }
  }

  // Add last field and row
  if (current.trim() || values.length > 0) {
    values.push(current.trim());
    rows.push(values);
  }

  return rows;
}

// Parse matrix from CSV values based on actual structure:
// Row 1: Legend (ignore)
// Row 2: Course codes (e.g., "Careskills Phase 1")
// Row 3: Course names
// Row 4: Course types (Mandatory/Core/etc)
// Row 5: Expiry periods (years or "one off")
// Row 6: Section dividers (management, etc)
// Row 7+: Staff names and their completion data
function parseMatrix(values, locationName) {
  if (!values || values.length < 7) {
    console.warn(`⚠️  Location "${locationName}" has no data (need at least 7 rows)`);
    return { staff: [], courses: [], matrix: {} };
  }

  // Parse course metadata from rows 2-5
  const courseCodesRow = values[1] || []; // Row 2 (0-indexed)
  const courseNamesRow = values[2] || []; // Row 3
  const courseTypesRow = values[3] || []; // Row 4
  const expiryRow = values[4] || []; // Row 5

  // Build course list starting from column M (index 12)
  const courses = [];
  const courseMap = {}; // Map of column index to course data

  for (let col = 12; col < Math.max(courseCodesRow.length, courseNamesRow.length); col++) {
    const code = courseCodesRow[col]?.trim();
    const name = courseNamesRow[col]?.trim();
    const type = courseTypesRow[col]?.trim();
    const expiry = expiryRow[col]?.trim();

    // Only add if we have a course name
    if (name) {
      let expiryMonths = 12; // default
      if (expiry && !expiry.toLowerCase().includes('one off')) {
        const months = parseInt(expiry) * 12;
        if (!isNaN(months)) expiryMonths = months;
      } else if (expiry && expiry.toLowerCase().includes('one off')) {
        expiryMonths = 9999; // effectively never expires
      }

      const courseObj = {
        name: name,
        code: code || name,
        platform: type || 'Unknown',
        is_core: (type && (type.toLowerCase().includes('core') || type.toLowerCase().includes('mandatory'))) || false,
        expiry_months: expiryMonths,
      };

      courses.push(courseObj);
      courseMap[col] = courseObj;
    }
  }

  // Parse staff starting from row 7 (index 6)
  const staff = [];
  const matrix = {};
  let currentSection = '';

  for (let row = 6; row < values.length; row++) {
    const rowData = values[row];
    const staffName = rowData[0]?.trim();

    if (!staffName) continue;

    // Check if this is a section divider (usually in row 6 style, check for keywords)
    if (staffName.toLowerCase().includes('management') || 
        staffName.toLowerCase().includes('team leaders') ||
        staffName.toLowerCase().includes('staff') ||
        staffName.startsWith('-') || 
        staffName.startsWith('=')) {
      currentSection = staffName;
      continue;
    }

    // Skip non-name rows
    if (staffName.toLowerCase().includes('notes') || 
        staffName.toLowerCase().includes('date') ||
        staffName.toLowerCase().includes('total')) {
      continue;
    }

    // This is a staff member
    staff.push({
      full_name: staffName,
      email: `${staffName.toLowerCase().replace(/\s+/g, '.')}@cascade-care.com`,
    });

    matrix[staffName] = {};

    // Parse training data for this staff member
    for (const [col, courseObj] of Object.entries(courseMap)) {
      const colNum = parseInt(col);
      if (colNum < rowData.length) {
        const value = rowData[colNum]?.trim();
        if (value && value !== '-' && value !== '') {
          // Check if it's a status label instead of a date
          const statusLabels = ['booked', 'awaiting', 'n/a', 'completed', 'in progress', 'overdue'];
          const isStatus = statusLabels.some(label => value.toLowerCase().includes(label));
          
          if (!isStatus) {
            // It might be a date
            matrix[staffName][courseObj.name] = {
              date: value,
              courseName: courseObj.name,
            };
          } else {
            // Store status label
            matrix[staffName][courseObj.name] = {
              date: null,
              status: value.toLowerCase(),
              courseName: courseObj.name,
            };
          }
        }
      }
    }
  }

  return { staff, courses, matrix };
}

// Parse various date formats
function parseDate(dateStr) {
  if (!dateStr) return null;

  dateStr = dateStr.trim();
  if (dateStr === '-' || dateStr === '' || dateStr.toLowerCase() === 'n/a') return null;

  // Skip status text indicators
  if (dateStr.toLowerCase().includes('not yet due') || 
      dateStr.toLowerCase().includes('awaiting') ||
      dateStr.toLowerCase().includes('training booked') ||
      dateStr.toLowerCase().includes('in progress') ||
      dateStr.toLowerCase().includes('n/a to this')) {
    return null;
  }

  // Extract date from mixed text (e.g., "01/01/2024 - Some notes" or "01/01/2024\nSome text")
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{4})/,  // DD/MM/YYYY
    /(\d{4}-\d{2}-\d{2})/,         // YYYY-MM-DD
  ];

  let dateMatch = null;
  for (const pattern of datePatterns) {
    const match = dateStr.match(pattern);
    if (match) {
      dateMatch = match[1];
      break;
    }
  }

  if (!dateMatch) {
    return null;
  }

  // Try ISO format (YYYY-MM-DD)
  let date = new Date(dateMatch);
  if (!isNaN(date.getTime())) return date;

  // Try DD/MM/YYYY
  const ddmmyyyy = dateMatch.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    date = new Date(ddmmyyyy[3], ddmmyyyy[2] - 1, ddmmyyyy[1]);
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

// Import a single location from CSV file
async function importLocationFromCSV(csvFilePath, locationName) {
  console.log(`\n📍 ${locationName}`);

  if (!fs.existsSync(csvFilePath)) {
    throw new Error(`CSV file not found: ${csvFilePath}`);
  }

  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  const values = parseCSV(csvContent);
  const { staff, courses, matrix } = parseMatrix(values, locationName);

  if (staff.length === 0) {
    console.log(`  ⚠️  No staff found in ${locationName}`);
    return;
  }

  console.log(`  👥 ${staff.length} staff members`);
  console.log(`  📚 ${courses.length} courses`);

  // Get or create location
  const { data: locationData, error: locError } = await supabase
    .from('locations')
    .upsert([{ name: locationName }], { onConflict: 'name' })
    .select();

  if (locError) throw locError;
  const location = locationData[0];

  // Import courses with proper metadata
  const courseMap = {};
  for (const course of courses) {
    const courseRecord = {
      name: course.name,
    };

    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .upsert([courseRecord], { onConflict: 'name' })
      .select();

    if (courseError) {
      console.error(`    ❌ Error upserting course "${course.name}":`, courseError.message);
      throw courseError;
    }
    
    if (courseData && courseData.length > 0) {
      courseMap[course.name] = courseData[0].id;
    }
  }

  // Import staff and training
  for (const staffMember of staff) {
    // Get or create staff
    const { data: staffData, error: staffError } = await supabase
      .from('profiles')
      .upsert([{ ...staffMember, location: location.name }], { onConflict: 'email' })
      .select();

    if (staffError) throw staffError;
    const staffId = staffData[0].id;

    // Create staff_location relationship
    await supabase.from('staff_locations').upsert(
      [{ staff_id: staffId, location_id: location.id }],
      { onConflict: 'staff_id,location_id' }
    );

    // Import training records
    const trainingRecords = [];
    for (const [courseName, trainingData] of Object.entries(matrix[staffMember.full_name] || {})) {
      if (!courseMap[courseName]) {
        console.warn(`    ⚠️  Course not found: "${courseName}"`);
        continue;
      }

      // Skip if no actual date is provided
      if (!trainingData.date) {
        continue;
      }

      const completionDate = parseDate(trainingData.date);
      if (!completionDate) {
        continue;
      }

      trainingRecords.push({
        staff_id: staffId,
        course_id: courseMap[courseName],
        completion_date: completionDate.toISOString().split('T')[0],
        completed_at_location_id: location.id,
        status: trainingData.status || 'completed',
      });
    }

    if (trainingRecords.length > 0) {
      // Try to insert records
      // Note: If you get "course_id column not found" error, run the migration manually:
      // 1. Go to Supabase SQL Editor
      // 2. Copy contents of supabase/migrations/20260127000008_create_training_matrix_schema.sql
      // 3. Paste and execute
      
      const { error: insertError } = await supabase
        .from('staff_training_matrix')
        .insert(trainingRecords);

      if (insertError) {
        // Log but continue - allows import of other staff
        console.warn(`    ⚠️  Insert error (${insertError.code}): ${insertError.message}`);
        if (insertError.code === 'PGRST204' || insertError.message.includes('course_id')) {
          console.warn(`       File: supabase/migrations/20260127000008_create_training_matrix_schema.sql`);
          // Don't throw - continue with next staff member
        } else if (insertError.code !== '23505') {
          // Throw for other errors (not duplicate key)
          throw insertError;
        }
      }
    }
  }

  console.log(`  ✅ Imported`);
}

// Main function
async function main() {
  try {
    // Get CSV folder path from args or use default
    const csvFolder = process.argv[2] || './training-data';

    if (!fs.existsSync(csvFolder)) {
      console.log(`\n📁 Creating folder: ${csvFolder}`);
      fs.mkdirSync(csvFolder, { recursive: true });
      console.log(`\n👉 Place your CSV files here and run again:`);
      console.log(`   node scripts/import-csv.js ${csvFolder}`);
      process.exit(0);
    }

    console.log(`\n🚀 CSV Import to Supabase`);
    console.log(`📁 Folder: ${csvFolder}`);

    // Get all CSV files
    const csvFiles = fs
      .readdirSync(csvFolder)
      .filter(f => f.endsWith('.csv'))
      .sort();

    if (csvFiles.length === 0) {
      console.error(`\n❌ No CSV files found in ${csvFolder}`);
      console.error('\n📝 How to export from Google Sheets:');
      console.error('  1. Open your Google Sheet');
      console.error('  2. Click File > Download > Comma Separated Values (.csv)');
      console.error('  3. Save as "Location Name.csv"');
      console.error('  4. Place in ' + csvFolder + ' folder');
      process.exit(1);
    }

    console.log(`📄 Found ${csvFiles.length} CSV files\n`);

    // Import each CSV file
    for (const csvFile of csvFiles) {
      const csvPath = path.join(csvFolder, csvFile);
      // Location name is filename without .csv extension
      const locationName = csvFile.replace('.csv', '');

      await importLocationFromCSV(csvPath, locationName);
    }

    console.log(`\n✅ All imports complete!\n`);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
