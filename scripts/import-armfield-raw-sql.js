import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function parseCSV() {
  const csvPath = path.join(__dirname, '..', 'training-data', 'Armfield House.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  
  const records = parse(fileContent, {
    skip_empty_lines: true,
  });

  let headerIndex = -1;
  let headers = [];
  let headerRow = [];

  // Find the header row (contains "Staff Name")
  for (let i = 0; i < records.length; i++) {
    if (records[i].some(cell => String(cell).toLowerCase().includes('staff name'))) {
      headerIndex = i;
      headerRow = records[i];
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error('Could not find header row with "Staff Name"');
  }

  // Extract course names from header row, starting from index 2
  headers = headerRow.slice(2).filter(h => h && String(h).trim() !== '');

  return { records, headerIndex, headers };
}

async function insertWithRawSQL() {
  console.log('Parsing CSV...');
  const { records, headerIndex, headers } = await parseCSV();
  
  console.log(`Found ${headers.length} courses`);

  // Get or create location
  let locationId;
  const { data: locations } = await supabase
    .from('locations')
    .select('id')
    .eq('name', 'Armfield House')
    .single();

  if (locations) {
    locationId = locations.id;
  } else {
    const { data: newLocation } = await supabase
      .from('locations')
      .insert([{ name: 'Armfield House', region: 'London' }])
      .select()
      .single();
    locationId = newLocation.id;
  }

  console.log('Using location:', locationId);

  // Ensure all courses exist
  console.log('Ensuring courses exist...');
  const courseMap = new Map();

  for (const courseName of headers) {
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('name', courseName)
      .eq('location_id', locationId)
      .single();

    if (courses) {
      courseMap.set(courseName, courses.id);
    } else {
      const { data: newCourse } = await supabase
        .from('courses')
        .insert([
          {
            name: courseName,
            location_id: locationId,
            expiry_months: 12,
          },
        ])
        .select()
        .single();
      courseMap.set(courseName, newCourse.id);
    }
  }

  console.log(`Mapped ${courseMap.size} courses`);

  // Collect training data
  const trainingRecords = [];
  const staffMap = new Map();

  for (let i = headerIndex + 1; i < records.length; i++) {
    const row = records[i];
    if (!row[0]) continue;

    const staffName = String(row[0]).trim();
    let staffId = staffMap.get(staffName);

    if (!staffId) {
      const { data: staff } = await supabase
        .from('profiles')
        .select('id')
        .eq('full_name', staffName)
        .single();

      if (staff) {
        staffId = staff.id;
        staffMap.set(staffName, staffId);
      } else {
        const { data: newStaff } = await supabase
          .from('profiles')
          .insert([
            {
              full_name: staffName,
              email: `${staffName.toLowerCase().replace(/\s+/g, '.')}@armfieldhouse.local`,
              location: 'Armfield House',
            },
          ])
          .select()
          .single();
        staffId = newStaff.id;
        staffMap.set(staffName, staffId);
      }
    }

    // Process each course column
    for (let colIndex = 2; colIndex < Math.min(row.length, headers.length + 2); colIndex++) {
      const cellValue = row[colIndex];
      if (!cellValue || String(cellValue).trim() === '') continue;

      const courseName = headers[colIndex - 2];
      const courseId = courseMap.get(courseName);

      if (!courseId) continue;

      const cellStr = String(cellValue).trim();

      let completionDate = null;
      let status = 'completed';

      // Parse special statuses
      if (cellStr === 'Booked') {
        status = 'Booked';
        completionDate = new Date().toISOString().split('T')[0];
      } else if (cellStr === 'Awaiting Training') {
        status = 'Awaiting Training';
        completionDate = new Date().toISOString().split('T')[0];
      } else if (cellStr === 'In Progress') {
        status = 'In Progress';
        completionDate = new Date().toISOString().split('T')[0];
      } else if (cellStr === 'Not Yet Due') {
        status = 'Not Yet Due';
        completionDate = new Date().toISOString().split('T')[0];
      } else {
        // Try to parse as date (DD/MM/YYYY)
        const dateMatch = cellStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dateMatch) {
          const [, day, month, year] = dateMatch;
          completionDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }

      if (completionDate) {
        trainingRecords.push({
          staff_id: staffId,
          course_id: courseId,
          completion_date: completionDate,
          status: status,
          completed_at_location_id: locationId,
        });
      }
    }
  }

  console.log(`\nCollected ${trainingRecords.length} training records`);
  console.log(`Inserting training records using raw SQL...`);

  // Build SQL INSERT statement
  if (trainingRecords.length > 0) {
    const values = trainingRecords
      .map((record, idx) => {
        const offset = idx * 5;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
      })
      .join(',');

    const flatParams = trainingRecords.flatMap(r => [
      r.staff_id,
      r.course_id,
      r.completion_date,
      r.status,
      r.completed_at_location_id
    ]);

    const sql = `
      INSERT INTO staff_training_matrix (staff_id, course_id, completion_date, status, completed_at_location_id)
      VALUES ${values}
      ON CONFLICT (staff_id, course_id) DO UPDATE SET
        completion_date = EXCLUDED.completion_date,
        status = EXCLUDED.status,
        completed_at_location_id = EXCLUDED.completed_at_location_id
    `;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_text: sql, params: flatParams });
      if (error) throw error;
      console.log('✅ All training records inserted successfully!');
    } catch (err) {
      console.error('Error with RPC approach, trying batch insert...');
      
      // Fallback: insert in smaller batches
      const batchSize = 50;
      for (let i = 0; i < trainingRecords.length; i += batchSize) {
        const batch = trainingRecords.slice(i, i + batchSize);
        const { error } = await supabase
          .from('staff_training_matrix')
          .insert(batch)
          .select();
        
        if (error) {
          console.error(`Error at batch ${i}:`, error);
        } else {
          console.log(`✅ Inserted batch ${i / batchSize + 1}`);
        }
      }
    }
  }

  console.log('\n✅ Import completed!');
}

insertWithRawSQL().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
