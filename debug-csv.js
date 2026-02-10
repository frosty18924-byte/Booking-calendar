import fs from 'fs';
import path from 'path';
import { parse as csvParse } from 'csv-parse/sync';

const CSV_FOLDER = '/Users/matthewfrost/training-portal/csv-import';
const csvFile = 'Armfield House Training Matrix - Staff Matrix.csv';
const filePath = path.join(CSV_FOLDER, csvFile);
const csvContent = fs.readFileSync(filePath, 'utf-8');

const records = csvParse(csvContent, { relax: false });

console.log(`\n📊 CSV ANALYSIS: Armfield House\n`);
console.log(`Total rows: ${records.length}\n`);

// Find course row (has many columns)
let courseRowIdx = -1;
for (let i = 0; i < Math.min(10, records.length); i++) {
  const colCount = records[i].filter(c => c && c.trim()).length;
  console.log(`Row ${i}: ${colCount} non-empty cols - First cell: "${(records[i][0] || '').substring(0, 30)}"`);
  if (colCount > 10) {
    courseRowIdx = i;
  }
}

console.log(`\n📌 Course row: ${courseRowIdx}`);
const courseRow = records[courseRowIdx];
console.log(`Columns 0-10: ${courseRow.slice(0, 11).map((c, i) => `${i}:"${(c || '').trim().substring(0, 15)}"`).join(' | ')}`);

console.log(`\n👥 Staff rows (starting from row ${courseRowIdx + 3}):`);
for (let i = courseRowIdx + 3; i < Math.min(courseRowIdx + 8, records.length); i++) {
  const staffName = (records[i][0] || '').trim();
  const dataCount = records[i].slice(1).filter(c => c && c.trim()).length;
  console.log(`  Row ${i}: "${staffName}" (${dataCount} data cells)`);
}

console.log('\n');
