import { NextRequest, NextResponse } from 'next/server';
import { addMonths } from 'date-fns';
import { requireRole } from '@/lib/apiAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ImportSummary = {
  rows: number;
  processedCells: number;
  upserts: number;
  skippedUnknownStaff: number;
  skippedUnknownCourses: number;
  errors: number;
};

function cleanCell(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeKey(value: string): string {
  return cleanCell(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeStaffName(value: string): string {
  const raw = cleanCell(value).normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (!raw) return '';

  // Handle "Last, First" -> "First Last"
  if (raw.includes(',')) {
    const [last, rest] = raw.split(',', 2).map((s) => s.trim());
    const recomposed = `${rest || ''} ${last || ''}`.trim();
    return normalizeKey(recomposed);
  }

  return normalizeKey(raw);
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  cells.push(current);
  return cells.map(cleanCell);
}

function hasBalancedQuotes(text: string): boolean {
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '"') continue;
    if (inQuotes && text[i + 1] === '"') {
      i++;
      continue;
    }
    inQuotes = !inQuotes;
  }
  return !inQuotes;
}

function parseLogicalRows(content: string, maxRows = 20000): string[][] {
  const physicalLines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const rows: string[][] = [];
  let buffer = '';

  for (const line of physicalLines) {
    buffer = buffer ? `${buffer}\n${line}` : line;
    if (!hasBalancedQuotes(buffer)) continue;

    const parsed = parseCsvLine(buffer);
    buffer = '';
    // skip totally empty rows
    if (parsed.every((c) => !c)) continue;
    rows.push(parsed);
    if (rows.length >= maxRows) break;
  }

  if (buffer && rows.length < maxRows) {
    const parsed = parseCsvLine(buffer);
    if (parsed.some((c) => c)) rows.push(parsed);
  }

  return rows;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseDdMmYyyy(input: string): string | null {
  const raw = cleanCell(input);
  if (!raw) return null;

  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  if (!day || !month || !year) return null;

  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return null;

  // Return yyyy-mm-dd
  const yyyy = String(year);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function computeExpiryDateIso(completionDateIso: string, expiryMonths: number | null, neverExpires: boolean | null): string | null {
  if (!completionDateIso) return null;
  if (neverExpires) return null;
  if (!expiryMonths || expiryMonths === 9999) return null;
  const [y, m, d] = completionDateIso.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  const exp = addMonths(base, expiryMonths);
  const yyyy = String(exp.getUTCFullYear());
  const mm = String(exp.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(exp.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function interpretCell(value: string): { kind: 'empty' } | { kind: 'status'; status: string } | { kind: 'date'; dateIso: string } {
  const v = cleanCell(value);
  if (!v) return { kind: 'empty' };

  const lower = v.toLowerCase();
  if (lower === 'allocated') return { kind: 'status', status: 'allocated' };
  if (lower === 'not yet due') return { kind: 'status', status: 'not_yet_due' };
  if (lower === 'n/a' || lower === 'na') return { kind: 'status', status: 'na' };

  const dateIso = parseDdMmYyyy(v);
  if (dateIso) return { kind: 'date', dateIso };

  return { kind: 'empty' };
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requireRole(['admin']);
    if ('error' in authz) return authz.error;

    const form = await request.formData();
    const locationId = String(form.get('locationId') || '').trim();
    const file = form.get('file');

    if (!locationId) {
      return NextResponse.json({ error: 'Missing locationId' }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing CSV file' }, { status: 400 });
    }

    const csvText = await file.text();
    const rows = parseLogicalRows(csvText, 25000);

    const headerIdx = rows.findIndex((r) => {
      const first = cleanCell(r[0] || '').toLowerCase();
      return first === 'staff name' || first === 'learner name' || first === "learner's name";
    });

    if (headerIdx < 0) {
      return NextResponse.json({ error: 'Could not find header row (Staff Name)' }, { status: 400 });
    }

    const headerRow = rows[headerIdx] || [];
    const courseNames = headerRow.slice(1).map((c) => cleanCell(c));
    if (courseNames.length === 0) {
      return NextResponse.json({ error: 'No course columns found' }, { status: 400 });
    }

    const dataRows = rows.slice(headerIdx + 1);

    const summary: ImportSummary = {
      rows: dataRows.length,
      processedCells: 0,
      upserts: 0,
      skippedUnknownStaff: 0,
      skippedUnknownCourses: 0,
      errors: 0,
    };

    const unknownStaffSamples = new Set<string>();
    const errorMessages = new Set<string>();

    const dividerLabels = new Set<string>([
      'notes',
      'date valid for',
      'management',
      'team leaders',
      'lead support',
      'staff team',
      'staff on probation',
      'inactive staff',
    ].map(normalizeKey));

    const ignoredMetaColumns = new Set<string>([
      'start date',
      'end date',
      'induction',
      'end of probation',
      'probation notes',
      'qualifications upon entry',
      'care certificate',
      'd b s',
      'dbs',
    ].map(normalizeKey));

    // Load staff + courses for this location.
    const { data: staffRows, error: staffErr } = await authz.service
      .from('profiles')
      .select('id, full_name')
      .eq('is_deleted', false);

    if (staffErr) return NextResponse.json({ error: staffErr.message }, { status: 400 });
    const staffMap = new Map<string, string>();
    (staffRows || []).forEach((s: any) => {
      if (!s?.id || !s?.full_name) return;
      staffMap.set(normalizeStaffName(String(s.full_name)), String(s.id));
    });

    // Courses configured for the selected location.
    const { data: locationCourses, error: courseErr } = await authz.service
      .from('location_training_courses')
      .select('training_course_id, training_courses(id, name, expiry_months, never_expires)')
      .eq('location_id', locationId);

    if (courseErr) return NextResponse.json({ error: courseErr.message }, { status: 400 });

    const courseMap = new Map<string, { id: string; expiryMonths: number | null; neverExpires: boolean | null }>();
    (locationCourses || []).forEach((lc: any) => {
      const c = Array.isArray(lc.training_courses) ? lc.training_courses[0] : lc.training_courses;
      if (!c?.id || !c?.name) return;
      courseMap.set(normalizeKey(String(c.name)), {
        id: String(c.id),
        expiryMonths: typeof c.expiry_months === 'number' ? c.expiry_months : null,
        neverExpires: typeof c.never_expires === 'boolean' ? c.never_expires : null,
      });
    });

    const unknownCourseColumns: string[] = [];

    // Precompute which header columns map to courses.
    const colToCourse: Array<{ col: number; courseId: string; expiryMonths: number | null; neverExpires: boolean | null } | null> = courseNames.map(
      (name, idx) => {
        const normalizedHeader = normalizeKey(name);
        if (!normalizedHeader) return null;
        if (ignoredMetaColumns.has(normalizedHeader)) return null;

        const hit = courseMap.get(normalizedHeader);
        if (!hit) return null;
        return { col: idx + 1, courseId: hit.id, expiryMonths: hit.expiryMonths, neverExpires: hit.neverExpires };
      }
    );

    courseNames.forEach((name, idx) => {
      const normalizedHeader = normalizeKey(name);
      if (!normalizedHeader) return;
      if (ignoredMetaColumns.has(normalizedHeader)) return;
      if (colToCourse[idx] === null) unknownCourseColumns.push(name);
    });

    summary.skippedUnknownCourses = unknownCourseColumns.length;

    const upserts: any[] = [];

    for (const row of dataRows) {
      const staffName = cleanCell(row[0] || '');
      if (!staffName) continue;

      if (dividerLabels.has(normalizeKey(staffName))) {
        // Divider / header row in the spreadsheet (not a staff member)
        continue;
      }

      const staffId = staffMap.get(normalizeStaffName(staffName));
      if (!staffId) {
        summary.skippedUnknownStaff++;
        if (unknownStaffSamples.size < 25) unknownStaffSamples.add(staffName);
        continue;
      }

      for (const mapping of colToCourse) {
        if (!mapping) continue;
        const raw = String(row[mapping.col] || '');
        const interpreted = interpretCell(raw);
        if (interpreted.kind === 'empty') continue;

        summary.processedCells++;

        if (interpreted.kind === 'status') {
          upserts.push({
            staff_id: staffId,
            course_id: mapping.courseId,
            completion_date: null,
            expiry_date: null,
            status: interpreted.status,
            completed_at_location_id: locationId,
          });
          continue;
        }

        const expiryIso = computeExpiryDateIso(interpreted.dateIso, mapping.expiryMonths, mapping.neverExpires);
        upserts.push({
          staff_id: staffId,
          course_id: mapping.courseId,
          completion_date: interpreted.dateIso,
          expiry_date: expiryIso,
          status: 'completed',
          completed_at_location_id: locationId,
        });
      }
    }

    // Upsert in chunks.
    const chunkSize = 500;
    for (let i = 0; i < upserts.length; i += chunkSize) {
      const chunk = upserts.slice(i, i + chunkSize);
      let { error } = await authz.service
        .from('staff_training_matrix')
        .upsert(chunk, { onConflict: 'staff_id,course_id,completed_at_location_id' });

      // Support deployments that still use the legacy unique key.
      if (error?.code === '42P10') {
        const fallback = await authz.service
          .from('staff_training_matrix')
          .upsert(chunk, { onConflict: 'staff_id,course_id' });
        error = fallback.error;
      }

      if (error) {
        summary.errors++;
        if (errorMessages.size < 10) errorMessages.add(error.message);
        console.error('Full matrix CSV import: upsert chunk failed:', error.message);
      } else {
        summary.upserts += chunk.length;
      }
    }

    return NextResponse.json({
      success: summary.errors === 0,
      summary,
      errors: Array.from(errorMessages.values()),
      unknownStaff: Array.from(unknownStaffSamples.values()),
      unknownCourses: unknownCourseColumns.slice(0, 50),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
