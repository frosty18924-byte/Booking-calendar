import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';

export const runtime = 'nodejs';

type TemplateListRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  updated_at: string | null;
  file_type: string | null;
};

function normalizeTagList(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    const tags = value.map(v => String(v).trim()).filter(Boolean);
    return tags.length ? tags : null;
  }
  if (typeof value === 'string') {
    const tags = value
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    return tags.length ? tags : null;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const authz = await requireRole(['staff', 'manager', 'scheduler', 'admin']);
    if ('error' in authz) return authz.error;

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const category = (searchParams.get('category') || '').trim();
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 50), 1), 200);

    let query = authz.service
      .from('templates')
      .select('id, name, description, category, tags, updated_at, file_type')
      .order('name', { ascending: true })
      .limit(limit);

    if (category) query = query.eq('category', category);

    if (q) {
      const escaped = q.replace(/%/g, '\\%').replace(/_/g, '\\_');
      const tagFilter = /^[\w-]+$/.test(q) ? `,tags.cs.{${q}}` : '';
      query = query.or(`name.ilike.%${escaped}%,description.ilike.%${escaped}%${tagFilter}`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }

    return NextResponse.json({ templates: (data || []) as TemplateListRow[] });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requireRole(['admin']);
    if ('error' in authz) return authz.error;

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }

    const form = await request.formData();
    const name = String(form.get('name') || '').trim();
    const description = String(form.get('description') || '').trim() || null;
    const category = String(form.get('category') || '').trim() || null;
    const tags = normalizeTagList(form.get('tags'));
    const file = form.get('file');

    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file' }, { status: 400 });

    const insert = await authz.service
      .from('templates')
      .insert({
        name,
        description,
        category,
        tags,
      })
      .select('id')
      .single();

    if (insert.error || !insert.data?.id) {
      return NextResponse.json({ error: insert.error?.message || 'Insert failed' }, { status: 400 });
    }

    const templateId = insert.data.id as string;
    const safeFileName = String(file.name || 'template').replace(/[^\w.\-() ]+/g, '_');
    const filePath = `${templateId}/${Date.now()}_${safeFileName}`;

    const buf = Buffer.from(await file.arrayBuffer());
    const upload = await authz.service.storage.from('templates').upload(filePath, buf, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

    if (upload.error) {
      await authz.service.from('templates').delete().eq('id', templateId);
      return NextResponse.json({ error: upload.error.message }, { status: 400 });
    }

    const update = await authz.service
      .from('templates')
      .update({
        file_path: filePath,
        file_name: safeFileName,
        file_type: file.type || null,
        file_size: file.size || null,
      })
      .eq('id', templateId)
      .select('id, name, description, category, tags, updated_at, file_type')
      .single();

    if (update.error) {
      return NextResponse.json({ error: update.error.message }, { status: 400 });
    }

    return NextResponse.json({ template: update.data });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
