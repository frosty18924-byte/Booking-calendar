#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

function usageAndExit(code = 1) {
  // Keep output short; this is run locally by an admin.
  console.error(
    [
      'Usage:',
      '  node scripts/import-templates-from-drive-sheet.mjs --csv <file.csv> [--dry-run]',
      '',
      'Required env:',
      '  NEXT_PUBLIC_SUPABASE_URL',
      '  SUPABASE_SERVICE_ROLE_KEY',
      '  GOOGLE_SERVICE_ACCOUNT_JSON (path to service account json)',
      '',
      'Notes:',
      '  - Share the Drive files (or parent folders) with the service account email.',
      '  - CSV must include a Drive link column (e.g. "link" or "url").',
    ].join('\n')
  );
  process.exit(code);
}

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

const csvPath = argValue('--csv');
const dryRun = process.argv.includes('--dry-run');
if (!csvPath) usageAndExit(1);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const googleServiceAccountJsonPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
if (!supabaseUrl || !supabaseServiceKey || !googleServiceAccountJsonPath) usageAndExit(1);

const serviceAccount = JSON.parse(fs.readFileSync(googleServiceAccountJsonPath, 'utf8'));
if (!serviceAccount?.client_email || !serviceAccount?.private_key) {
  console.error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON: missing client_email/private_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[_-]+/g, ' ');
}

function pickHeader(headers, candidates) {
  const norm = headers.map(h => ({ raw: h, norm: normalizeHeader(h) }));
  for (const c of candidates) {
    const found = norm.find(h => h.norm === c);
    if (found) return found.raw;
  }
  return null;
}

function extractDriveFileId(url) {
  const raw = String(url || '').trim();
  if (!raw) return null;

  // Common patterns:
  // - https://drive.google.com/file/d/<id>/view
  // - https://docs.google.com/document/d/<id>/edit
  // - https://drive.google.com/open?id=<id>
  const m1 = raw.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m1) return m1[1];

  try {
    const u = new URL(raw);
    const id = u.searchParams.get('id');
    if (id && /^[a-zA-Z0-9_-]{10,}$/.test(id)) return id;
  } catch {
    // ignore
  }

  const m2 = raw.match(/([a-zA-Z0-9_-]{20,})/);
  return m2 ? m2[1] : null;
}

function base64Url(input) {
  return Buffer.from(input).toString('base64url');
}

async function getGoogleAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 60 * 55,
  };

  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  sign.end();
  const signature = sign.sign(serviceAccount.private_key);
  const assertion = `${unsigned}.${Buffer.from(signature).toString('base64url')}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Google token error: ${res.status} ${data?.error || ''} ${data?.error_description || ''}`.trim());
  }
  if (!data?.access_token) throw new Error('Google token error: missing access_token');
  return data.access_token;
}

async function driveGetJson(accessToken, url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Drive API error ${res.status}: ${data?.error?.message || 'unknown error'}`);
  }
  return data;
}

async function driveDownload(accessToken, fileId, mimeType, exportMimeType) {
  const isGoogleDoc = String(mimeType || '').startsWith('application/vnd.google-apps.');
  const url = isGoogleDoc
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportMimeType)}`
    : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Drive download error ${res.status}: ${text.slice(0, 180)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || (isGoogleDoc ? exportMimeType : 'application/octet-stream');
  return { buf, contentType, isGoogleDoc };
}

function ensureExtension(name, mimeType) {
  const lower = String(name || '').toLowerCase();
  if (mimeType === 'application/pdf' && !lower.endsWith('.pdf')) return `${name}.pdf`;
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
    !lower.endsWith('.docx')
  )
    return `${name}.docx`;
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && !lower.endsWith('.xlsx'))
    return `${name}.xlsx`;
  return name;
}

function parseTags(raw) {
  const v = String(raw || '').trim();
  if (!v) return null;
  const tags = v
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
  return tags.length ? tags : null;
}

async function main() {
  const absCsvPath = path.resolve(process.cwd(), csvPath);
  if (!fs.existsSync(absCsvPath)) {
    console.error(`CSV not found: ${absCsvPath}`);
    process.exit(1);
  }

  const rows = parse(fs.readFileSync(absCsvPath, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  });

  if (!Array.isArray(rows) || rows.length === 0) {
    console.error('CSV has no rows.');
    process.exit(1);
  }

  const headers = Object.keys(rows[0] || {});
  const linkCol = pickHeader(headers, ['link', 'url', 'drive link', 'drive url', 'drive']);
  if (!linkCol) {
    console.error(`Could not find a Drive link column. Headers: ${headers.join(', ')}`);
    process.exit(1);
  }

  const nameCol = pickHeader(headers, ['name', 'template', 'title']) || null;
  const descCol = pickHeader(headers, ['description', 'notes', 'details']) || null;
  const categoryCol = pickHeader(headers, ['category', 'section', 'folder']) || null;
  const tagsCol = pickHeader(headers, ['tags', 'keywords']) || null;

  console.log(`Rows: ${rows.length}`);
  console.log(`Columns: link=${linkCol}${nameCol ? `, name=${nameCol}` : ''}${categoryCol ? `, category=${categoryCol}` : ''}`);
  console.log(dryRun ? 'Mode: DRY RUN (no writes)' : 'Mode: WRITE');

  const accessToken = await getGoogleAccessToken();

  const exportMimeType = 'application/pdf';

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || {};
    const driveUrl = r[linkCol];
    const fileId = extractDriveFileId(driveUrl);
    if (!fileId) {
      skipped++;
      continue;
    }

    const nameFromSheet = nameCol ? String(r[nameCol] || '').trim() : '';
    const name = nameFromSheet || `Template ${fileId.slice(0, 6)}`;
    const description = descCol ? String(r[descCol] || '').trim() || null : null;
    const category = categoryCol ? String(r[categoryCol] || '').trim() || null : null;
    const tags = tagsCol ? parseTags(r[tagsCol]) : null;

    try {
      const meta = await driveGetJson(
        accessToken,
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,modifiedTime`
      );

      const driveModifiedAt = meta.modifiedTime ? new Date(meta.modifiedTime).toISOString() : null;

      const { data: existing } = await supabase
        .from('templates')
        .select('id, file_path, source_drive_modified_at')
        .eq('source_drive_file_id', fileId)
        .maybeSingle();

      if (existing?.source_drive_modified_at && driveModifiedAt) {
        const prev = new Date(existing.source_drive_modified_at).getTime();
        const next = new Date(driveModifiedAt).getTime();
        if (Number.isFinite(prev) && Number.isFinite(next) && next <= prev) {
          // Metadata may still need updates (name/category/tags), so do a light update.
          if (!dryRun) {
            await supabase
              .from('templates')
              .update({
                name,
                description,
                category,
                tags,
                source_drive_url: String(driveUrl || '').trim() || null,
                source_drive_mime_type: meta.mimeType || null,
                source_drive_name: meta.name || null,
              })
              .eq('id', existing.id);
          }
          skipped++;
          continue;
        }
      }

      if (dryRun) {
        ok++;
        continue;
      }

      let templateId = existing?.id || null;
      if (!templateId) {
        const insert = await supabase
          .from('templates')
          .insert({
            name,
            description,
            category,
            tags,
            source_drive_file_id: fileId,
            source_drive_url: String(driveUrl || '').trim() || null,
            source_drive_modified_at: driveModifiedAt,
            source_drive_mime_type: meta.mimeType || null,
            source_drive_name: meta.name || null,
          })
          .select('id')
          .single();
        if (insert.error || !insert.data?.id) throw new Error(insert.error?.message || 'Insert failed');
        templateId = insert.data.id;
      }

      const downloaded = await driveDownload(accessToken, fileId, meta.mimeType, exportMimeType);
      const fileType = downloaded.contentType;
      const defaultFileName = ensureExtension(meta.name || name, downloaded.isGoogleDoc ? exportMimeType : fileType);
      const safeFileName = String(defaultFileName).replace(/[^\w.\-() ]+/g, '_');
      const filePath = `${templateId}/${Date.now()}_${safeFileName}`;

      const upload = await supabase.storage.from('templates').upload(filePath, downloaded.buf, {
        contentType: fileType,
        upsert: false,
      });

      if (upload.error) {
        throw new Error(`Storage upload failed: ${upload.error.message}`);
      }

      await supabase
        .from('templates')
        .update({
          name,
          description,
          category,
          tags,
          file_path: filePath,
          file_name: safeFileName,
          file_type: fileType || null,
          file_size: downloaded.buf.length,
          source_drive_file_id: fileId,
          source_drive_url: String(driveUrl || '').trim() || null,
          source_drive_modified_at: driveModifiedAt,
          source_drive_mime_type: meta.mimeType || null,
          source_drive_name: meta.name || null,
        })
        .eq('id', templateId);

      ok++;
      if (i % 10 === 0) console.log(`Progress: ${i + 1}/${rows.length} ok=${ok} skipped=${skipped} failed=${failed}`);
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Row ${i + 1}/${rows.length} failed (fileId=${fileId}): ${msg}`);
    }
  }

  console.log(`Done. ok=${ok} skipped=${skipped} failed=${failed}`);
  if (failed > 0) process.exit(2);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

