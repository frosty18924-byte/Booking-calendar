#!/usr/bin/env node

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

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndImport() {
  console.log('🔍 Training Matrix Import Check\n');
  console.log('================================\n');

  try {
    // Check if tables are accessible
    console.log('1. Checking table accessibility...');
    const { data: tableTest, error: tableError } = await supabase
      .from('staff_training_matrix')
      .select('*')
      .limit(1);

    if (tableError) {
      console.log('   ❌ Cannot read staff_training_matrix:', tableError.message);
      return;
    }
    console.log('   ✅ staff_training_matrix is readable');

    // Check profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (profileError) {
      console.log('   ❌ Cannot read profiles:', profileError.message);
      return;
    }
    console.log('   ✅ profiles is readable');

    // Check courses
    const { data: courses, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .limit(1);

    if (courseError) {
      console.log('   ❌ Cannot read courses:', courseError.message);
      return;
    }
    console.log('   ✅ courses is readable');

    if (!profiles?.[0] || !courses?.[0]) {
      console.log('\n⚠️  No test data found. Create some sample data first.');
      return;
    }

    // Test insert
    console.log('\n2. Testing INSERT permission...');
    const testInsert = await supabase
      .from('staff_training_matrix')
      .insert([{
        staff_id: profiles[0].id,
        course_id: courses[0].id,
        completion_date: '2026-01-28',
      }])
      .select();

    if (testInsert.error) {
      console.log('   ❌ INSERT failed:', testInsert.error.message);
      if (testInsert.error.code === 'PGRST204') {
        console.log('\n🚨 SCHEMA CACHE ISSUE DETECTED!\n');
        console.log('The PostgREST schema cache is out of sync.');
        console.log('\n📋 TO FIX THIS:\n');
        console.log('1. Open your Supabase Dashboard');
        console.log('2. Go to SQL Editor');
        console.log('3. Copy and paste the contents of SCHEMA_FIX.sql');
        console.log('4. Click Run');
        console.log('5. Wait for completion, then try this script again\n');
      }
      return;
    }

    console.log('   ✅ INSERT works!');
    console.log('\n✨ Schema cache is FIXED!\n');
    console.log('You can now run the import script:');
    console.log('   node scripts/import-armfield-batch.js');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAndImport();
