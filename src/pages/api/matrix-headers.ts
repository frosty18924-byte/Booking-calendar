import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const locationToCsv: { [key: string]: string } = {
  'Banks House School': 'Banks House Training Matrix - Staff Matrix.csv',
  'Felix House School': 'Felix House Training Matrix - Staff Matrix.csv',
  'Armfield House': 'Armfield House Training Matrix - Staff Matrix.csv',
  'Bonetti House': 'Bonetti House Training Matrix - Staff Matrix.csv',
  'Charlton House': 'Charlton House Training Matrix - Staff Matrix.csv',
  'Banks House': 'Banks House Training Matrix - Staff Matrix.csv',
  'Moore House': 'Moore House Training Matrix - Staff Matrix.csv',
  'Group': 'Group Training Matrix - Staff Matrix.csv',
  'Peters House': 'Peters House Training Matrix - Staff Matrix.csv',
  'Cohen House': 'Cohen House Training Matrix - Staff Matrix.csv',
  'Hurst House': 'Hurst House Training Matrix - Staff Matrix.csv',
  'Stiles House': 'Stiles House Training Matrix - Staff Matrix.csv',
  'Felix House': 'Felix House Training Matrix - Staff Matrix.csv',
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { location } = req.query;
  const csvFile = locationToCsv[location as string];
  if (!csvFile) return res.status(404).json({ headers: ['Face to Face'] });

  const csvPath = path.join(process.cwd(), 'csv-import', csvFile);
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');
    const headerLine = lines.find(line => line.includes('Staff Name'));
    if (!headerLine) return res.status(200).json({ headers: ['Face to Face'] });
    const headers = headerLine.split(',').map(h => h.replace(/"/g, '').trim());
    return res.status(200).json({ headers });
  } catch (err) {
    return res.status(200).json({ headers: ['Face to Face'] });
  }
}
