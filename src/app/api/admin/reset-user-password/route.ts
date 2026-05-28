import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authz = await requireRole(['admin']);
    if ('error' in authz) return authz.error;

    const body = await request.json();
    const { targetUserId, newPassword } = body;

    if (!targetUserId || !newPassword) {
      return NextResponse.json(
        { error: 'targetUserId and newPassword required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Verify target user exists
    const { data: targetUser, error: userError } = await authz.service
      .from('profiles')
      .select('id')
      .eq('id', targetUserId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update password using admin API
    const { error: updateError } = await authz.service.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Mark password_needs_change as false
    const { error: profileError } = await authz.service
      .from('profiles')
      .update({ password_needs_change: false })
      .eq('id', targetUserId);

    if (profileError) {
      console.warn('Could not update password_needs_change flag:', profileError);
    }

    return NextResponse.json({
      success: true,
      message: `Password updated for user ${targetUserId}`,
    });
  } catch (error) {
    console.error('Admin reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
