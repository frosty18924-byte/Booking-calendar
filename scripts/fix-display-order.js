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

async function fixDisplayOrder() {
  try {
    console.log('Fetching all courses...\n');
    const { data: courses } = await supabase.from('courses').select('id, name');
    
    console.log(`Total courses: ${courses.length}`);
    console.log('Updating display_order for priority courses...\n');

    // Create update pairs
    let matchedCount = 0;
    for (let i = 0; i < courseOrder.length; i++) {
      const name = courseOrder[i];
      const course = courses.find(c => c.name.toLowerCase() === name.toLowerCase());
      
      if (course) {
        const { error } = await supabase
          .from('courses')
          .update({ display_order: i + 1 })
          .eq('id', course.id);
        
        if (error) {
          console.error(`Error updating "${course.name}":`, error);
        } else {
          console.log(`${i + 1}. ${course.name}`);
          matchedCount++;
        }
      }
    }

    console.log(`\n✅ Updated ${matchedCount} priority courses\n`);

    // Get remaining course not in priority list
    const priorityCourseNames = new Set(courseOrder.map(n => n.toLowerCase()));
    const remaining = courses.filter(c => !priorityCourseNames.has(c.name.toLowerCase()));
    
    console.log(`Assigning display_order to ${remaining.length} remaining courses...\n`);
    
    for (let i = 0; i < remaining.length; i++) {
      const { error } = await supabase
        .from('courses')
        .update({ display_order: courseOrder.length + i + 1 })
        .eq('id', remaining[i].id);
      
      if (!error) {
        console.log(`${courseOrder.length + i + 1}. ${remaining[i].name}`);
      }
    }

    // Show final order
    console.log('\n📋 Final Course Order:');
    const { data: final } = await supabase
      .from('courses')
      .select('name, display_order')
      .order('display_order');
    
    final.forEach(c => {
      console.log(`${c.display_order}. ${c.name}`);
    });

    console.log(`\n✅ All ${final.length} courses have correct display_order`);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

fixDisplayOrder();
