import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = path.join(__dirname, '..', '.env.local');
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

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSchema() {
  try {
    console.log('Checking staff_training_matrix table...\n');

    // Try to get a simple record
    const { data, error } = await supabase
      .from('staff_training_matrix')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error querying staff_training_matrix:', error);
    } else {
      console.log('✅ staff_training_matrix table is accessible');
      if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
      }
    }

    // Check if staff table exists
    console.log('\nChecking profiles table...');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .limit(1);

    if (profileError) {
      console.error('❌ profiles error:', profileError);
    } else {
      console.log('✅ profiles table ok. Sample:', profiles[0]);
    }

    // Check if courses table exists
    console.log('\nChecking courses table...');
    const { data: courses, error: courseError } = await supabase
      .from('courses')
      .select('id, name')
      .limit(1);

    if (courseError) {
      console.error('❌ courses error:', courseError);
    } else {
      console.log('✅ courses table ok. Sample:', courses[0]);
    }

    // Check locations table
    console.log('\nChecking locations table...');
    const { data: locations, error: locError } = await supabase
      .from('locations')
      .select('id, name')
      .limit(1);

    if (locError) {
      console.error('❌ locations error:', locError);
    } else {
      console.log('✅ locations table ok. Sample:', locations[0]);
    }

    // Try a very simple insert
    if (profiles && profiles[0] && courses && courses[0]) {
      console.log('\n\nAttempting test insert...');
      const { data: testData, error: testError } = await supabase
        .from('staff_training_matrix')
        .insert([{
          staff_id: profiles[0].id,
          course_id: courses[0].id,
          completion_date: '2026-01-20',
        }])
        .select();

      if (testError) {
        console.error('❌ Insert failed:', testError);
      } else {
        console.log('✅ Insert successful!', testData);
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

debugSchema();
