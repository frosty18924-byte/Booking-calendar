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

async function updateLocationCourseDeliveryTypes() {
  console.log('\n🔄 Updating location_courses with delivery types from CSV files\n');

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

      // Row 2 = course names
      // Row 3 = delivery types
      if (records.length < 3) {
        console.log(`   ⚠️  CSV has less than 3 rows`);
        continue;
      }

      const courseNamesRow = records[1]; // Row 2 (0-indexed as 1)
      const deliveryTypesRow = records[2]; // Row 3 (0-indexed as 2)

      // Get courses for this location
      const { data: locationCourses, error: lcError } = await supabase
        .from('location_courses')
        .select(`
          id,
          course_id,
          courses(id, name)
        `)
        .eq('location_id', location.id)
        .order('display_order', { ascending: true });

      if (lcError) {
        console.error(`   Error fetching courses for ${locationName}:`, lcError);
        continue;
      }

      if (!locationCourses || locationCourses.length === 0) {
        console.log(`   ℹ️  No courses found for location`);
        continue;
      }

      console.log(`   Found ${locationCourses.length} courses`);

      // Build a map of course names to delivery types from CSV
      const deliveryTypeMap = new Map();
      for (let i = 0; i < courseNamesRow.length; i++) {
        const courseName = courseNamesRow[i]?.trim();
        const deliveryType = deliveryTypesRow[i]?.trim() || 'Face to Face';
        if (courseName) {
          deliveryTypeMap.set(courseName.toLowerCase(), deliveryType);
        }
      }

      console.log(`   CSV has delivery type mappings for ${deliveryTypeMap.size} courses`);

      // Update location_courses with delivery types
      let updated = 0;
      for (const lc of locationCourses) {
        const courseName = lc.courses?.name?.toLowerCase();
        if (!courseName) continue;

        const deliveryType = deliveryTypeMap.get(courseName) || 'Face to Face';

        const { error: updateError } = await supabase
          .from('location_courses')
          .update({ delivery_type: deliveryType })
          .eq('id', lc.id);

        if (updateError) {
          console.error(`   Error updating course ${lc.courses?.name}:`, updateError);
        } else {
          updated++;
        }
      }

      console.log(`   ✅ Updated ${updated} courses with delivery types`);
    }

    console.log('\n✅ All location courses updated with delivery types from CSV files\n');
  } catch (error) {
    console.error('Error:', error);
  }
}

updateLocationCourseDeliveryTypes();
