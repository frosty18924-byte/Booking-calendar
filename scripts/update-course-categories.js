const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
console.log('Service Role Key:', supabaseKey ? 'Set' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const courseCategories = {
  'CYP Safeguarding Children and Young People': 'Safeguarding',
  'Safeguarding and Protection of Adults': 'Safeguarding',
  'First Aid': 'First Aid & Emergency',
  'Fire Safety': 'Health & Safety',
  'Food Hygiene': 'Health & Safety',
  'GDPR 1': 'Compliance',
  'GDPR 2': 'Compliance',
  'Health and Safety': 'Health & Safety',
  'Lone Working': 'Health & Safety',
  'Infection Control': 'Health & Safety',
  'The Oliver McGowan Mandatory Training': 'Training',
  'Behaviours That Challenge': 'Training',
  'Communication': 'Training',
  'Communication Workshop': 'Training',
  'Dignity in Care': 'Care Practice',
  'Epilepsy Awareness': 'Training',
  'Epilepsy Classroom': 'Training',
  'Equality, Diversity, Inclusion': 'Training',
  'LGBTQ+ Aware for Care': 'Training',
  'Managing Continence': 'Care Practice',
  'Medication Practice': 'Care Practice',
  'Medication Classroom': 'Care Practice',
  'Advanced Medicines & Audit': 'Care Practice',
  'Medication Errors and Investigations Workshop': 'Management',
  'Mental Capacity & DOL\'S': 'Care Practice',
  'Moving and Handling': 'Health & Safety',
  'Nutrition and Hydration': 'Care Practice',
  'Oral Care': 'Care Practice',
  'Oral Hygiene': 'Care Practice',
  'Person Centred Care': 'Care Practice',
  'Personal Care': 'Care Practice',
  'Positive Behaviour Support': 'Training',
  'PBS': 'Training',
  'Prevent Extremism and Radicalisation': 'Safeguarding',
  'Recording Information': 'Training',
  'Risk Assessment': 'Health & Safety',
  'PEG online training': 'Care Practice',
  'PEG Training': 'Care Practice',
  'Team Teach Positive Behaviour Training Level 2': 'Training',
  'Team Teach Positive Behaviour Training Advanced Modules': 'Training',
  'Fire Safety Training': 'Health & Safety',
  'Emergency First Aid at Work': 'First Aid & Emergency',
  'Safeguarding Adults Awareness': 'Safeguarding',
  'Accredited Essential Autism': 'Training',
  'Relationship, Sex Health Education Workshop': 'Training',
  'Manager and Lead Keyworker Star': 'Management',
  'Incident Report Writing': 'Management',
  'Sexual Harassment - Duty to Prevent Workshop': 'Training',
  'Manager Only Training': 'Management',
  'Supervision': 'Management',
  'Care Certificate Assessment': 'Qualifications',
  'Safer Recruitment Online (The Key)': 'Recruitment',
  'Safer Recruitment (EduCare)': 'Recruitment',
  'Safeguarding for Provider Managers (CQC)': 'Safeguarding',
  'Management Support Programme (MSP)': 'Management',
  'Complaints Workshop': 'Management',
  'Sickness Workshop': 'Management',
  'Disciplinary Workshop': 'Management',
  'Grievances Workshop': 'Management',
  'Capability Workshop': 'Management',
  'Disciplinary Refresher': 'Management',
  'Sickness Refresher': 'Management',
  'Grievance Refresher': 'Management',
  'Capability Refresher': 'Management',
  'Investigation Process and Report Writing Workshop': 'Management',
  'NVQ Level 3 Health and Social Care': 'Qualifications',
  'NVQ Level 4 Diploma in Health and social care management': 'Qualifications',
  'NVQ Level 5 Diploma in Health and social care management': 'Qualifications',
};

async function updateCourseCategories() {
  try {
    console.log('Fetching all courses...');
    const { data: courses, error: fetchError } = await supabase
      .from('courses')
      .select('id, name');

    if (fetchError) {
      console.error('Error fetching courses:', fetchError);
      return;
    }

    console.log(`Found ${courses.length} courses`);

    let updated = 0;
    let notFound = 0;

    for (const course of courses) {
      const category = courseCategories[course.name];
      
      if (category) {
        const { error: updateError } = await supabase
          .from('courses')
          .update({ category })
          .eq('id', course.id);

        if (updateError) {
          console.error(`Error updating ${course.name}:`, updateError);
        } else {
          console.log(`✓ ${course.name} -> ${category}`);
          updated++;
        }
      } else {
        console.log(`! ${course.name} (no category mapping)`);
        notFound++;
      }
    }

    console.log(`\nUpdated: ${updated}, Not found: ${notFound}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

updateCourseCategories();
