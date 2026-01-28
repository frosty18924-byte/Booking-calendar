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
  'RSHE',
  'Oral Hygiene',
  'PEG Training',
  'Star',
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
  'Complaints Workshop',
  'Sickness Workshop',
  'Disciplinary Workshop',
  'Grievances Workshop',
  'Capability Workshop',
  'Medication Errors and Investigations Workshop',
  'Investigation Process and Report Writing Workshop',
  'Disciplinary Refresher',
  'Sickness Refresher',
  'Grievance Refresher',
  'Capability Refresher',
  'NVQ Level 3 Health and Social Care',
  'NVQ Level 4 Diploma in Health and social care management',
  'NVQ Level 5 Diploma in Health and social care management',
];

async function reorderCourses() {
  try {
    console.log('Fetching all courses...');
    const { data: courses, error: fetchError } = await supabase
      .from('courses')
      .select('id, name')
      .order('display_order', { ascending: true, nullsFirst: false });

    if (fetchError) {
      console.error('Error fetching courses:', fetchError);
      process.exit(1);
    }

    console.log(`Found ${courses.length} courses in database`);

    let matchedCount = 0;
    let unmatchedNames = [];

    // Update display_order for each course in the specified order
    for (let i = 0; i < courseOrder.length; i++) {
      const inputName = courseOrder[i];
      const foundCourse = courses.find(
        c => c.name.toLowerCase() === inputName.toLowerCase()
      );

      if (foundCourse) {
        console.log(`Updating: "${foundCourse.name}" -> display_order: ${i + 1}`);
        
        const { error } = await supabase.rpc('update_course_data', {
          p_course_id: foundCourse.id,
          p_updates: JSON.stringify({ display_order: i + 1 }),
        });

        if (error) {
          console.error(`Error updating course "${foundCourse.name}":`, error);
        } else {
          matchedCount++;
        }
      } else {
        unmatchedNames.push(inputName);
        console.warn(`⚠️  Could not find course: "${inputName}"`);
      }
    }

    console.log(`\n✅ Successfully reordered ${matchedCount} courses`);
    
    if (unmatchedNames.length > 0) {
      console.log(`\n⚠️  ${unmatchedNames.length} courses not found in database:`);
      unmatchedNames.forEach(name => console.log(`   - "${name}"`));
    }

    // Show final course order
    const { data: updatedCourses } = await supabase
      .from('courses')
      .select('id, name, display_order')
      .order('display_order', { ascending: true, nullsFirst: false });

    console.log('\n📋 Final Course Order:');
    updatedCourses.forEach((course, idx) => {
      console.log(`${idx + 1}. ${course.name}`);
    });

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

reorderCourses();
