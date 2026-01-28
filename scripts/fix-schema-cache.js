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

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

async function fixSchema() {
  try {
    console.log('Attempting to fix schema cache issue...\n');

    // Try using the Supabase admin API to invalidate the schema cache
    // This requires hitting the admin endpoint directly
    console.log('Trying to recreate the table with a comment to trigger refresh...');

    // Execute raw SQL via a custom query
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql: `
          -- Add a comment to the table to trigger schema cache refresh
          COMMENT ON TABLE staff_training_matrix IS 'Staff training records with course tracking';
          
          -- Verify the columns exist
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'staff_training_matrix'
          ORDER BY ordinal_position;
        `
      });

    if (error) {
      console.error('❌ RPC exec_sql not available:', error.message);
      console.log('\nTrying alternative approach: manually refresh schema...');

      // Try a different approach - use information_schema directly
      const checkColumns = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'staff_training_matrix'
      `;

      // We can't execute raw SQL directly, so let's try recreating with a temporary name
      // and then swapping

      console.log('\nThe schema cache issue requires manual intervention from Supabase.');
      console.log('Options:');
      console.log('1. Go to Supabase Dashboard > SQL Editor');
      console.log('2. Run: NOTIFY pgrst, \'reload schema\';');
      console.log('3. Or restart PostgREST service');
      
      return;
    }

    if (data) {
      console.log('✅ Schema info:', data);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixSchema();
