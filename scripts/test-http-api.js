import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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

async function testWithFetch() {
  try {
    console.log('Testing direct HTTP API approach...\n');

    // Get sample staff and course
    let response = await fetch(`${supabaseUrl}/rest/v1/profiles?limit=1&select=id`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      }
    });
    
    const profiles = await response.json();
    console.log('Profiles:', profiles[0]);

    response = await fetch(`${supabaseUrl}/rest/v1/courses?limit=1&select=id`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      }
    });
    
    const courses = await response.json();
    console.log('Courses:', courses[0]);

    if (!profiles[0] || !courses[0]) {
      console.error('Missing test data');
      return;
    }

    // Try insert via HTTP API
    console.log('\nAttempting insert via direct API...');
    response = await fetch(`${supabaseUrl}/rest/v1/staff_training_matrix`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        staff_id: profiles[0].id,
        course_id: courses[0].id,
        completion_date: '2026-01-20',
        status: 'completed',
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Insert successful!');
      console.log(result);
    } else {
      console.error('❌ Insert failed:');
      console.error('Status:', response.status);
      console.error('Error:', result);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testWithFetch();
