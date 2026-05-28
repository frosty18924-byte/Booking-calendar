import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authz = await requireRole(['staff', 'manager', 'scheduler', 'admin']);
    if ('error' in authz) return authz.error;

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current and new passwords required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Use service client to update password
    const { error } = await authz.service.auth.admin.updateUserById(authz.userId, {
      password: newPassword,
    });

    if (error) {
      console.error('Password update error:', error);
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Mark password_needs_change as false
    const { error: profileError } = await authz.service
      .from('profiles')
      .update({ password_needs_change: false })
      .eq('id', authz.userId);

    if (profileError) {
      console.warn('Could not update password_needs_change flag:', profileError);
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
