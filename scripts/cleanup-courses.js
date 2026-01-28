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
  'Capability Workshop',
  'Disciplinary Workshop',
  'Grievances Workshop',
  'Sickness Workshop',
];

async function cleanupCourses() {
  try {
    console.log('Step 1: Getting courses with training data...\n');
    
    // Get all courses with training data
    const { data: trainingRecords } = await supabase
      .from('staff_training_matrix')
      .select('course_id');
    
    const courseIdsWithData = [...new Set(trainingRecords.map(r => r.course_id))];
    console.log(`Found ${courseIdsWithData.length} courses with training data\n`);

    // Get all courses
    const { data: allCourses } = await supabase
      .from('courses')
      .select('id, name');
    
    console.log(`Total courses in database: ${allCourses.length}\n`);

    // Find courses to delete (no training data)
    const coursesToDelete = allCourses.filter(c => !courseIdsWithData.includes(c.id));
    console.log(`Courses to DELETE (no training data): ${coursesToDelete.length}`);
    console.log('These courses will be removed:');
    coursesToDelete.slice(0, 20).forEach(c => console.log(`  - ${c.name}`));
    if (coursesToDelete.length > 20) console.log(`  ... and ${coursesToDelete.length - 20} more\n`);

    // Delete courses without training data
    if (coursesToDelete.length > 0) {
      console.log(`\nDeleting ${coursesToDelete.length} courses with no training data...`);
      const { error } = await supabase
        .from('courses')
        .delete()
        .in('id', coursesToDelete.map(c => c.id));
      
      if (error) {
        console.error('Error deleting courses:', error);
        process.exit(1);
      }
      console.log(`✅ Deleted ${coursesToDelete.length} courses\n`);
    }

    // Now update display_order for courses in the specified order
    console.log('Step 2: Updating display_order for priority courses...\n');
    
    const { data: remainingCourses } = await supabase
      .from('courses')
      .select('id, name');
    
    console.log(`Remaining courses: ${remainingCourses.length}\n`);

    let matchedCount = 0;

    // Update courses in the priority order
    for (let i = 0; i < courseOrder.length; i++) {
      const inputName = courseOrder[i];
      const foundCourse = remainingCourses.find(
        c => c.name.toLowerCase() === inputName.toLowerCase()
      );

      if (foundCourse) {
        try {
          await supabase.rpc('update_course_data', {
            p_course_id: foundCourse.id,
            p_updates: JSON.stringify({ display_order: i + 1 }),
          });
          console.log(`${i + 1}. ${foundCourse.name}`);
          matchedCount++;
        } catch (error) {
          console.error(`Error updating course "${foundCourse.name}":`, error);
        }
      }
    }

    console.log(`\n✅ Updated display_order for ${matchedCount} courses`);

    // Assign remaining courses (those not in the priority list) sequential numbers after the priority courses
    const priorityCourseIds = new Set(
      courseOrder
        .map(name => remainingCourses.find(c => c.name.toLowerCase() === name.toLowerCase()))
        .filter(c => c)
        .map(c => c.id)
    );

    const remainingCoursesToOrder = remainingCourses.filter(c => !priorityCourseIds.has(c.id));
    
    console.log(`\nStep 3: Assigning display_order to remaining ${remainingCoursesToOrder.length} courses...\n`);
    
    for (let i = 0; i < remainingCoursesToOrder.length; i++) {
      const course = remainingCoursesToOrder[i];
      try {
        await supabase.rpc('update_course_data', {
          p_course_id: course.id,
          p_updates: JSON.stringify({ display_order: courseOrder.length + i + 1 }),
        });
      } catch (error) {
        console.error(`Error updating course "${course.name}":`, error);
      }
    }

    console.log(`✅ Assigned display_order to remaining courses\n`);

    // Show final course order
    const { data: finalCourses } = await supabase
      .from('courses')
      .select('id, name, display_order')
      .order('display_order', { ascending: true, nullsFirst: false });

    console.log('📋 Final Course Order:');
    finalCourses.slice(0, 70).forEach((course, idx) => {
      console.log(`${course.display_order}. ${course.name}`);
    });

    if (finalCourses.length > 70) {
      console.log(`\n... and ${finalCourses.length - 70} more courses`);
    }

    console.log(`\n✅ Total courses remaining: ${finalCourses.length}`);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

cleanupCourses();
