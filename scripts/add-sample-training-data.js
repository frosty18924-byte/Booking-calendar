#!/usr/bin/env node

/**
 * Add Sample Training Records
 * Creates sample training completion records for demonstration
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addSampleRecords() {
  try {
    console.log('\n🚀 Adding sample training records...\n');

    // Get first few staff members
    const { data: staffLocations } = await supabase
      .from('staff_locations')
      .select('staff_id, location_id')
      .limit(5);

    if (!staffLocations || staffLocations.length === 0) {
      console.error('❌ No staff members found');
      return;
    }

    // Get first few courses
    const { data: courses } = await supabase
      .from('courses')
      .select('id, name')
      .limit(5);

    if (!courses || courses.length === 0) {
      console.error('❌ No courses found');
      return;
    }

    const trainingRecords = [];
    const today = new Date();

    // Create sample records
    let recordCount = 0;
    for (const staffLoc of staffLocations) {
      for (let i = 0; i < 3 && i < courses.length; i++) {
        const course = courses[i];
        
        // Vary completion dates
        const daysAgo = Math.floor(Math.random() * 200); // 0-200 days ago
        const completionDate = new Date(today);
        completionDate.setDate(completionDate.getDate() - daysAgo);

        trainingRecords.push({
          staff_id: staffLoc.staff_id,
          course_id: course.id,
          completion_date: completionDate.toISOString().split('T')[0],
          completed_at_location_id: staffLoc.location_id,
          status: 'completed'
        });

        recordCount++;
      }
    }

    if (trainingRecords.length === 0) {
      console.error('❌ Could not create sample records');
      return;
    }

    // Insert records
    const { error, data } = await supabase
      .from('staff_training_matrix')
      .insert(trainingRecords);

    if (error) {
      console.error('❌ Error inserting records:', error.message);
      return;
    }

    console.log(`✅ Added ${trainingRecords.length} sample training records\n`);
    console.log('📊 Sample records created with:');
    console.log(`   - Staff members: ${staffLocations.length}`);
    console.log(`   - Courses per staff: 3`);
    console.log(`   - Total records: ${trainingRecords.length}`);
    console.log('\n🎉 Visit the Training Matrix page to see the results!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addSampleRecords();
