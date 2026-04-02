import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';

export const runtime = 'nodejs';

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

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requireRole(['staff', 'manager', 'scheduler', 'admin']);
    if ('error' in authz) return authz.error;

    const { id } = await ctx.params;

    const { data, error } = await authz.service
      .from('templates')
      .select('id, name, description, category, tags, updated_at, file_type, file_name, file_size')
      .eq('id', id)
      .single();

    if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: 404 });
    return NextResponse.json({ template: data });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requireRole(['admin']);
    if ('error' in authz) return authz.error;

    const { id } = await ctx.params;
    const contentType = request.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }

    const form = await request.formData();
    const name = String(form.get('name') || '').trim() || null;
    const description = String(form.get('description') || '').trim() || null;
    const category = String(form.get('category') || '').trim() || null;
    const tags = normalizeTagList(form.get('tags'));
    const isActiveRaw = form.get('is_active');
    const isActive =
      typeof isActiveRaw === 'string'
        ? isActiveRaw === 'true'
        : typeof isActiveRaw === 'boolean'
          ? isActiveRaw
          : null;

    const file = form.get('file');

    const updates: Record<string, any> = {};
    if (name !== null) updates.name = name;
    if (form.has('description')) updates.description = description;
    if (form.has('category')) updates.category = category;
    if (form.has('tags')) updates.tags = tags;
    if (isActive !== null) updates.is_active = isActive;

    if (file instanceof File) {
      const current = await authz.service.from('templates').select('file_path').eq('id', id).single();
      if (current.error) {
        return NextResponse.json({ error: current.error.message }, { status: 404 });
      }

      const safeFileName = String(file.name || 'template').replace(/[^\w.\-() ]+/g, '_');
      const filePath = `${id}/${Date.now()}_${safeFileName}`;
      const buf = Buffer.from(await file.arrayBuffer());
      const upload = await authz.service.storage.from('templates').upload(filePath, buf, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
      if (upload.error) {
        return NextResponse.json({ error: upload.error.message }, { status: 400 });
      }

      updates.file_path = filePath;
      updates.file_name = safeFileName;
      updates.file_type = file.type || null;
      updates.file_size = file.size || null;

      const previous = current.data?.file_path as string | null;
      if (previous) {
        await authz.service.storage.from('templates').remove([previous]);
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const { data, error } = await authz.service
      .from('templates')
      .update(updates)
      .eq('id', id)
      .select('id, name, description, category, tags, updated_at, file_type, file_name, file_size')
      .single();

    if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    return NextResponse.json({ template: data });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
