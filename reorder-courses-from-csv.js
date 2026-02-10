import { parse } from 'csv-parse/sync';
import { readFileSync, readdirSync } from 'fs';
import { resolve, basename } from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function reorderCoursesFromCSV() {
  console.log('\n🔄 Reordering courses to match CSV file order\n');

  try {
    // Get all locations
    const { data: locations, error: locError } = await supabase
      .from('locations')
      .select('id, name');

    if (locError || !locations) {
      console.error('Error fetching locations:', locError);
      return;
    }

    console.log(`Found ${locations.length} locations`);

    // Process each CSV file
    const csvDir = './csv-import';
    const csvFiles = readdirSync(csvDir).filter(f => f.endsWith('.csv'));

    for (const csvFile of csvFiles) {
      const locationName = csvFile.replace(' Training Matrix - Staff Matrix.csv', '').trim();
      console.log(`\n📄 Processing: ${csvFile}`);
      console.log(`   Looking for location: ${locationName}`);

      // Find matching location
      const location = locations.find(l => l.name === locationName);
      if (!location) {
        console.log(`   ⚠️  Location not found for: ${locationName}`);
        continue;
      }

      // Read CSV file
      const filePath = resolve(csvDir, csvFile);
      const content = readFileSync(filePath, 'utf-8');
      const records = parse(content, { headers: false });

      // Row 1 (index 0) = some metadata
      // Row 2 (index 1) = section headers
      // Row 3 onwards (index 2+) = course names in the first column, then data columns
      
      // We need to find which columns have course names
      // Looking at rows 3+ to find the actual course name row
      if (records.length < 3) {
        console.log(`   ⚠️  CSV has less than 3 rows`);
        continue;
      }

      // Row 2 has the section headers
      const sectionHeadersRow = records[1];
      
      // Find the course names - they start from row 3 in the first column
      // But we need to look at all columns to find where each course appears
      const courseColumnMap = new Map(); // course name -> column index
      
      // Look through all rows to find course names
      for (let rowIdx = 2; rowIdx < records.length; rowIdx++) {
        const row = records[rowIdx];
        for (let colIdx = 0; colIdx < row.length; colIdx++) {
          const cellValue = row[colIdx]?.trim();
          if (cellValue && cellValue.length > 0) {
            // Skip empty and staff names
            if (!courseColumnMap.has(cellValue)) {
              courseColumnMap.set(cellValue, colIdx);
            }
          }
        }
      }

      console.log(`   Found ${courseColumnMap.size} courses in CSV`);

      // Get courses for this location
      const { data: locationCourses, error: lcError } = await supabase
        .from('location_courses')
        .select(`
          id,
          course_id,
          courses(id, name)
        `)
        .eq('location_id', location.id);

      if (lcError) {
        console.error(`   Error fetching courses for ${locationName}:`, lcError);
        continue;
      }

      if (!locationCourses || locationCourses.length === 0) {
        console.log(`   ℹ️  No courses found for location`);
        continue;
      }

      // Update display_order to match CSV column order
      let updated = 0;
      for (const lc of locationCourses) {
        const courseName = lc.courses?.name;
        if (!courseName) continue;

        const csvColumnIdx = courseColumnMap.get(courseName);
        if (csvColumnIdx === undefined) {
          console.log(`   ⚠️  Course not found in CSV: ${courseName}`);
          continue;
        }

        // Update display_order to match CSV column position
        const { error: updateError } = await supabase
          .from('location_courses')
          .update({ display_order: csvColumnIdx })
          .eq('id', lc.id);

        if (updateError) {
          console.error(`   Error updating ${courseName}:`, updateError);
        } else {
          updated++;
        }
      }

      console.log(`   ✅ Updated ${updated} courses to match CSV order`);
    }

    console.log('\n✅ All courses reordered to match CSV files\n');
  } catch (error) {
    console.error('Error:', error);
  }
}

reorderCoursesFromCSV();
