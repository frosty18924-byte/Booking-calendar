#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Course order as specified by the user (corrected for actual DB names)
const courseOrder = [
  'CYP Safeguarding Children and Young People',
  'Safeguarding and Protection of Adults',
  'First Aid',
  'Fire Safety',
  'Food Hygiene',
  'GDPR 1',
  'Health and Safety',
  'Lone Working',
  'Infection Control',
  'The Oliver McGowan Mandatory Training',
  'Behaviours That Challenge',
  'Communication',
  'Dignity in Care',
  'Epilepsy Awareness',
  'Equality, Diversity, Inclusion',
  'LGBTQ+ Aware for Care',
  'Managing Continence',
  'Medication Practice',
  'Mental Capacity & DOL\'S',
  'Moving and Handling',
  'Nutrition and Hydration',
  'Oral Care',
  'Person Centred Care',
  'Personal Care',
  'Positive Behaviour Support',
  'Prevent Extremism and Radicalisation',
  'Recording Information',
  'Risk Assessment',
  'PEG online training',
  'Medication Classroom',
  'Team Teach\nPositive Behaviour \nTraining Level 2',
  'Team Teach\nPositive Behaviour\nTraining Advanced\nModules',
  'Fire Safety Training',
  'Emergency First Aid at Work',
  'Epilepsy Classroom',
  'Safeguarding Adults Awareness',
  'Accredited Essential Autism',
  'Relationship, Sex Health Education Workshop',
  'Oral Hygiene',
  'PEG Training',
  'Manager and Lead Keyworker Star',
  'Communication Workshop',
  'PBS',
  'Incident Report Writing',
  'Sexual Harassment - Duty to Prevent Workshop',
  'GDPR 2',
  'Supervision',
  'Care Certificate Assessment',
  'Advanced Medicines & Audit',
  'Safer Recruitment Online (The Key)',
  'Safer Recruitment (EduCare)',
  'Safeguarding for Provider Managers (CQC)',
  'Management Support Programme (MSP)',
  'Sickness Workshop',
  'Disciplinary Workshop',
  'Grievances Workshop',
  'Capability Workshop',
];

async function reorderAndCleanCourses() {
  try {
    console.log('🚀 Starting comprehensive course reorder and cleanup...\n');

    // Step 1: Fetch all courses
    console.log('📊 Step 1: Fetching all courses...');
    const { data: allCourses, error: fetchError } = await supabase
      .from('courses')
      .select('id, name, display_order')
      .order('name', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching courses:', fetchError);
      process.exit(1);
    }

    console.log(`✅ Found ${allCourses.length} courses in database\n`);

    // Step 2: Reorder courses in the courses table
    console.log('📋 Step 2: Updating global course display order...');
    let matchedCount = 0;
    let unmatchedNames = [];
    const courseIdMap = new Map(); // To track for location_courses reordering

    for (let i = 0; i < courseOrder.length; i++) {
      const inputName = courseOrder[i];
      const foundCourse = allCourses.find(
        c => c.name.toLowerCase() === inputName.toLowerCase()
      );

      if (foundCourse) {
        console.log(`  ✓ "${foundCourse.name}" -> order: ${i + 1}`);
        courseIdMap.set(foundCourse.id, i + 1);
        
        const { error } = await supabase
          .from('courses')
          .update({ display_order: i + 1 })
          .eq('id', foundCourse.id);

        if (error) {
          console.error(`  ❌ Error updating "${foundCourse.name}":`, error);
        } else {
          matchedCount++;
        }
      } else {
        unmatchedNames.push(inputName);
        console.warn(`  ⚠️  Could not find: "${inputName}"`);
      }
    }

    console.log(`\n✅ Successfully reordered ${matchedCount} courses\n`);
    
    if (unmatchedNames.length > 0) {
      console.log(`⚠️  ${unmatchedNames.length} courses not found in database:`);
      unmatchedNames.forEach(name => console.log(`   - "${name}"`));
      console.log();
    }

    // Step 3: Update location_courses display_order to match the global course order
    console.log('📋 Step 3: Updating location-specific course ordering...');
    
    const { data: locationCourses, error: lcFetchError } = await supabase
      .from('location_courses')
      .select('id, course_id, location_id, display_order');

    if (lcFetchError) {
      console.error('❌ Error fetching location_courses:', lcFetchError);
      process.exit(1);
    }

    console.log(`📊 Found ${locationCourses.length} location_courses entries\n`);

    let updatedLocationCourses = 0;
    
    for (const lc of locationCourses) {
      const globalOrder = courseIdMap.get(lc.course_id);
      if (globalOrder && lc.display_order !== globalOrder) {
        const { error } = await supabase
          .from('location_courses')
          .update({ display_order: globalOrder })
          .eq('id', lc.id);
        
        if (!error) {
          updatedLocationCourses++;
        }
      }
    }

    console.log(`✅ Updated ${updatedLocationCourses} location_courses display orders\n`);

    // Step 4: Check for location_courses with courses that have NO training records
    console.log('🧹 Step 4: Checking for location-specific courses without training history...');
    
    const { data: trainingMatrix, error: tmError } = await supabase
      .from('staff_training_matrix')
      .select('course_id')
      .not('completion_date', 'is', null);

    if (tmError) {
      console.error('❌ Error fetching training matrix:', tmError);
      process.exit(1);
    }

    const coursesWithTrainingRecords = new Set(trainingMatrix.map(t => t.course_id));
    
    let removedCount = 0;
    const toRemove = [];

    for (const lc of locationCourses) {
      if (!coursesWithTrainingRecords.has(lc.course_id)) {
        const course = allCourses.find(c => c.id === lc.course_id);
        if (course) {
          console.log(`  🗑️  Removing: "${course.name}" (no staff training records)`);
          toRemove.push(lc.id);
          removedCount++;
        }
      }
    }

    if (toRemove.length > 0) {
      console.log(`\n🗑️  Deleting ${toRemove.length} location_courses without training history...\n`);
      
      for (const id of toRemove) {
        const { error } = await supabase
          .from('location_courses')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.error(`  ❌ Error deleting location_course ${id}:`, error);
        }
      }
    } else {
      console.log(`✅ All location_courses have associated training records - no removals needed\n`);
    }

    // Step 5: Display final course order
    console.log('📋 Step 5: Final Global Course Order:\n');
    const { data: finalCourses } = await supabase
      .from('courses')
      .select('id, name, display_order')
      .order('display_order', { ascending: true });

    finalCourses.forEach((course, idx) => {
      console.log(`${String(idx + 1).padStart(2, ' ')}. ${course.name}`);
    });

    console.log(`\n✅ ✅ ✅ Course management complete! ✅ ✅ ✅\n`);
    console.log(`Summary:`);
    console.log(`  • Courses reordered (global): ${matchedCount}`);
    console.log(`  • Location courses updated: ${updatedLocationCourses}`);
    console.log(`  • Location courses removed: ${removedCount}`);
    console.log(`  • Total courses in system: ${finalCourses.length}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

reorderAndCleanCourses();
