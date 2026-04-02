import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requireRole(['staff', 'manager', 'scheduler', 'admin']);
    if ('error' in authz) return authz.error;

    const { id } = await ctx.params;
    const { searchParams } = new URL(request.url);
    const disposition = (searchParams.get('disposition') || 'inline').toLowerCase();
    const expiresIn = Math.min(Math.max(Number(searchParams.get('expiresIn') || 120), 10), 3600);

    const { data: tmpl, error: tmplError } = await authz.service
      .from('templates')
      .select('file_path, file_name, file_type')
      .eq('id', id)
      .single();

    if (tmplError || !tmpl?.file_path) {
      return NextResponse.json({ error: tmplError?.message || 'Template not found' }, { status: 404 });
    }

    const signed = await authz.service.storage.from('templates').createSignedUrl(tmpl.file_path, expiresIn, {
      download: disposition === 'attachment' ? (tmpl.file_name || true) : false,
    });

    if (signed.error || !signed.data?.signedUrl) {
      return NextResponse.json({ error: signed.error?.message || 'Failed to sign URL' }, { status: 400 });
    }

    return NextResponse.json({
      url: signed.data.signedUrl,
      fileType: tmpl.file_type || null,
      fileName: tmpl.file_name || null,
      expiresIn,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
