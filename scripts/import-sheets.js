#!/usr/bin/env node

/**
 * Google Sheets to Supabase Migration Script
 * 
 * This script imports your training matrix from Google Sheets to Supabase
 * 
 * Prerequisites:
 * 1. Install dependencies: npm install google-auth-library @google-cloud/sheets
 * 2. Set environment variables: 
 *    - GOOGLE_SERVICE_ACCOUNT_EMAIL
 *    - GOOGLE_SERVICE_ACCOUNT_KEY (JSON as string or path to file)
 *    - SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY
 * 3. Share your Google Sheets with the service account email
 */

const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Initialize Google Sheets
async function getGoogleSheetsClient() {
  let keyContent;
  
  // Try to get from environment variable
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      // Try parsing as JSON first
      keyContent = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    } catch {
      // If it fails, try reading as file path
      try {
        keyContent = JSON.parse(
          fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'utf8')
        );
      } catch {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY must be valid JSON or path to JSON file');
      }
    }
  } else {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable not set');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: keyContent,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Import a single location's training matrix
 * @param {string} spreadsheetId - Google Sheet ID
 * @param {string} sheetName - Name of the sheet (location name)
 * @param {object} sheets - Google Sheets API client
 */
async function importLocationMatrix(spreadsheetId, sheetName) {
  const sheets = await getGoogleSheetsClient();
  
  console.log(`\n📊 Importing: ${sheetName}`);
  
  try {
    // Get all data from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: `'${sheetName}'!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log(`⚠️  No data found in sheet: ${sheetName}`);
      return;
    }

    // Create or get location
    const { data: locationData, error: locationError } = await supabase
      .from('locations')
      .upsert(
        { name: sheetName },
        { onConflict: 'name' }
      )
      .select();

    if (locationError) throw locationError;
    const location = locationData[0];
    console.log(`✓ Location: ${location.name} (ID: ${location.id})`);

    // Parse the matrix
    // Assuming format: 
    // Row 1: Headers (Course names)
    // Column A: Staff names with role dividers
    
    const courseHeaders = rows[0].slice(1); // Skip first column (staff names)
    const staffData = rows.slice(1); // Skip header row

    let processedCount = 0;
    let currentRole = null;

    for (const row of staffData) {
      const staffName = row[0];
      
      // Skip empty rows or role dividers
      if (!staffName || staffName.trim() === '') continue;
      
      // Check if this is a role divider
      if (staffName.toLowerCase().includes('role:') || staffName.toLowerCase().includes('---')) {
        currentRole = staffName.replace('Role:', '').trim();
        console.log(`  👥 Role: ${currentRole}`);
        continue;
      }

      // Get or create staff member
      const { data: staffData, error: staffError } = await supabase
        .from('profiles')
        .upsert(
          { 
            full_name: staffName.trim(),
            email: `${staffName.trim().toLowerCase().replace(/\s+/g, '.')}@cascade-care.com`,
          },
          { onConflict: 'full_name' }
        )
        .select();

      if (staffError) {
        console.log(`  ✗ Error processing staff: ${staffName}`);
        continue;
      }

      const staff = staffData[0];

      // Add staff to location
      await supabase.from('staff_locations').upsert(
        {
          staff_id: staff.id,
          location_id: location.id,
          role: currentRole,
        },
        { onConflict: 'staff_id,location_id' }
      );

      // Process each course
      for (let colIdx = 1; colIdx < courseHeaders.length; colIdx++) {
        const courseName = courseHeaders[colIdx];
        const completionDate = row[colIdx];

        if (!courseName || !completionDate) continue;

        // Get or create course
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .upsert(
            { name: courseName.trim() },
            { onConflict: 'name' }
          )
          .select();

        if (courseError) continue;
        const course = courseData[0];

        // Link course to location if not already linked
        await supabase.from('location_courses').upsert(
          {
            location_id: location.id,
            course_id: course.id,
            is_required: true,
          },
          { onConflict: 'location_id,course_id' }
        );

        // Parse the date (handle various formats)
        const parsedDate = parseDate(completionDate);
        
        if (parsedDate) {
          // Insert training record
          await supabase.from('staff_training_matrix').upsert(
            {
              staff_id: staff.id,
              course_id: course.id,
              completion_date: parsedDate,
              completed_at_location_id: location.id,
              status: 'completed',
            },
            { onConflict: 'staff_id,course_id' }
          );
        }
      }

      processedCount++;
    }

    console.log(`✓ Processed ${processedCount} staff members`);

  } catch (error) {
    console.error(`✗ Error importing ${sheetName}:`, error.message);
  }
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  dateStr = dateStr.trim();
  if (dateStr === '-' || dateStr === '' || dateStr.toLowerCase() === 'not completed') {
    return null;
  }

  // Try to parse
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]; // Return as YYYY-MM-DD
  }

  return null;
}

/**
 * Main import function
 */
async function main() {
  console.log('🚀 Starting Training Matrix Import\n');

  // You'll need to provide your Google Sheet ID and sheet names
  const SPREADSHEET_ID = process.argv[2] || process.env.GOOGLE_SHEETS_ID;
  const SHEET_NAMES = (process.argv[3] || process.env.SHEET_NAMES || '').split(',').map(s => s.trim());

  if (!SPREADSHEET_ID) {
    console.error('❌ Error: Provide Google Sheet ID as argument or GOOGLE_SHEETS_ID env var');
    console.error('Usage: node import-sheets.js <spreadsheet-id> [sheet1,sheet2,...]');
    process.exit(1);
  }

  if (SHEET_NAMES.length === 0) {
    console.error('❌ Error: Provide sheet names as argument or SHEET_NAMES env var (comma-separated)');
    process.exit(1);
  }

  try {
    // Import each location
    for (const sheetName of SHEET_NAMES) {
      await importLocationMatrix(SPREADSHEET_ID, sheetName);
    }

    console.log('\n✅ Import complete!');
    console.log('You can now view the training matrix in your app.');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { importLocationMatrix };
