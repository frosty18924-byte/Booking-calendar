import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';

function isMissingTableError(error: any): boolean {
  const status = typeof error?.status === 'number' ? error.status : undefined;
  const message = String(error?.message || '').toLowerCase();
  return status === 404 || message.includes('schema cache') || message.includes('could not find') || message.includes('not found');
}

export async function POST(request: NextRequest) {
  const authz = await requireRole(['admin']);
  if ('error' in authz) return authz.error;

  const body = await request.json().catch(() => ({}));
  const referralId = body?.referralId as string | undefined;

  if (!referralId) {
    return NextResponse.json({ error: 'referralId is required' }, { status: 400 });
  }

  const { service } = authz;

  // Best-effort cleanup of related rows/files.
  try {
    const { data: attachmentRows, error: attachmentSelectError } = await service
      .from('referral_attachments')
      .select('file_path')
      .eq('referral_id', referralId);

    if (attachmentSelectError && !isMissingTableError(attachmentSelectError)) {
      return NextResponse.json(
        { error: attachmentSelectError.message, code: attachmentSelectError.code },
        { status: 400 }
      );
    }

    const paths = (attachmentRows || [])
      .map((row: any) => row.file_path)
      .filter((p: any): p is string => typeof p === 'string' && p.length > 0);

    if (paths.length > 0) {
      // Storage deletes are best-effort; even if they fail, we can still delete the ticket.
      await service.storage.from('referral_attachments').remove(paths);
    }

    const { error: attachmentDeleteError } = await service
      .from('referral_attachments')
      .delete()
      .eq('referral_id', referralId);

    if (attachmentDeleteError && !isMissingTableError(attachmentDeleteError)) {
      return NextResponse.json(
        { error: attachmentDeleteError.message, code: attachmentDeleteError.code },
        { status: 400 }
      );
    }
  } catch {
    // ignore
  }

  try {
    const { error: updatesDeleteError } = await service
      .from('ticket_updates')
      .delete()
      .eq('referral_id', referralId);

    if (updatesDeleteError && !isMissingTableError(updatesDeleteError)) {
      return NextResponse.json(
        { error: updatesDeleteError.message, code: updatesDeleteError.code },
        { status: 400 }
      );
    }
  } catch {
    // ignore
  }

  const { error: referralDeleteError } = await service
    .from('it_referrals')
    .delete()
    .eq('id', referralId);

  if (referralDeleteError) {
    return NextResponse.json(
      { error: referralDeleteError.message, code: referralDeleteError.code },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}

