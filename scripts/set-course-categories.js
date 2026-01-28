const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '../.env.local');
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
  console.error('Missing Supabase credentials in .env.local');
  console.error('URL:', supabaseUrl);
  console.error('Key:', supabaseKey ? '***' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const categoryMappings = {
  'cyp safeguarding children and young people': 'Safeguarding and Protection',
  'safeguarding and protection of adults': 'Safeguarding and Protection',
  'first aid': 'First Aid and Safety',
  'fire safety': 'First Aid and Safety',
  'food hygiene': 'Food and Nutrition',
  'gdpr 1': 'Compliance',
  'gdpr 2': 'Compliance',
  'health and safety': 'Health and Safety',
  'lone working': 'Health and Safety',
  'infection control': 'Health and Safety',
  'the oliver mcgowan mandatory training': 'Core Training',
  'behaviours that challenge': 'Core Training',
  'communication': 'Core Training',
  'dignity in care': 'Core Training',
  'epilepsy awareness': 'Core Training',
  'equality, diversity, inclusion': 'Core Training',
  'lgbtq+ aware for care': 'Core Training',
  'managing continence': 'Core Training',
  'medication practice': 'Core Training',
  'mental capacity & dol\'s': 'Core Training',
  'moving and handling': 'Core Training',
  'nutrition and hydration': 'Core Training',
  'oral care': 'Core Training',
  'person centred care': 'Core Training',
  'personal care': 'Core Training',
  'positive behaviour support': 'Core Training',
  'prevent extremism and radicalisation': 'Core Training',
  'recording information': 'Core Training',
  'risk assessment': 'Core Training',
  'peg online training': 'Online Courses',
  'medication classroom': 'Online Courses',
  'team teach positive behaviour training level 2': 'Specialist Training',
  'team teach positive behaviour training advanced modules': 'Specialist Training',
  'fire safety training': 'Specialist Training',
  'emergency first aid at work': 'Specialist Training',
  'epilepsy classroom': 'Specialist Training',
  'safeguarding adults awareness': 'Specialist Training',
  'accredited essential autism': 'Specialist Training',
  'relationship, sex health education workshop': 'Specialist Training',
  'oral hygiene': 'Specialist Training',
  'peg training': 'Specialist Training',
  'manager and lead keyworker star': 'Manager Training',
  'communication workshop': 'Manager Training',
  'pbs': 'Manager Training',
  'incident report writing': 'Manager Training',
  'sexual harassment - duty to prevent workshop': 'Manager Training',
  'manager only training': 'Manager Training',
  'supervision': 'Management Courses',
  'care certificate assessment': 'Management Courses',
  'advanced medicines & audit': 'Management Courses',
  'safer recruitment online (the key)': 'Management Courses',
  'safer recruitment (educare)': 'Management Courses',
  'safeguarding for provider managers (cqc)': 'Management Courses',
  'management support programme (msp)': 'Management Courses',
  'complaints workshop': 'Workshops',
  'sickness workshop': 'Workshops',
  'disciplinary workshop': 'Workshops',
  'grievances workshop': 'Workshops',
  'capability workshop': 'Workshops',
  'medication errors and investigations workshop': 'Workshops',
  'investigation process and report writing workshop': 'Workshops',
  'disciplinary refresher': 'Refresher Training',
  'sickness refresher': 'Refresher Training',
  'grievance refresher': 'Refresher Training',
  'capability refresher': 'Refresher Training',
  'nvq level 3 health and social care': 'Qualifications',
  'nvq level 4 diploma in health and social care management': 'Qualifications',
  'nvq level 5 diploma in health and social care management': 'Qualifications',
};

async function updateCourseCategories() {
  try {
    const { data: courses, error: fetchError } = await supabase
      .from('courses')
      .select('id, name');

    if (fetchError) {
      console.error('Error fetching courses:', fetchError);
      process.exit(1);
    }

    console.log(`Found ${courses.length} courses`);

    let updated = 0;
    let notFound = 0;

    for (const course of courses) {
      const courseNameLower = course.name.toLowerCase().trim();
      const category = categoryMappings[courseNameLower];

      if (category) {
        const { error: updateError } = await supabase
          .from('courses')
          .update({ category })
          .eq('id', course.id);

        if (updateError) {
          console.error(`Error updating ${course.name}:`, updateError);
        } else {
          console.log(`✓ ${course.name} → ${category}`);
          updated++;
        }
      } else {
        console.log(`⚠ ${course.name} (no category mapping)`);
        notFound++;
      }
    }

    console.log(`\nResults: ${updated} updated, ${notFound} not found`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateCourseCategories();
