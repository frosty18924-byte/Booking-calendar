import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const authz = await requireRole(['admin', 'scheduler', 'manager', 'staff']);
  if ('error' in authz) return authz.error;

  const { error } = await authz.service
    .from('profiles')
    .update({ password_needs_change: false })
    .eq('id', authz.userId);

  if (error) {
    console.error('Error clearing password_needs_change:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
