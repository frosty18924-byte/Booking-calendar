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

async function testInsert() {
  try {
    // Test single insert
    const { data: staff } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (!staff || staff.length === 0) {
      console.error('No staff found');
      return;
    }

    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .limit(1);

    if (!courses || courses.length === 0) {
      console.error('No courses found');
      return;
    }

    const { data, error } = await supabase
      .from('staff_training_matrix')
      .insert([{
        staff_id: staff[0].id,
        course_id: courses[0].id,
        completion_date: '2026-01-28',
        status: 'completed',
      }])
      .select();

    if (error) {
      console.error('Insert error:', error);
    } else {
      console.log('Insert successful:', data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testInsert();
