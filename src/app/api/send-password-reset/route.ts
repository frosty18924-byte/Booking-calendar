import { NextRequest, NextResponse } from 'next/server';
import { getEmailSendOptionsFromHeaders, sendPasswordResetEmail } from '@/lib/email';
import { createServiceClient, requireRole } from '@/lib/apiAuth';

export async function POST(request: NextRequest) {
  try {
    const authz = await requireRole(['admin']);
    if ('error' in authz) return authz.error;

    const { email, staffName } = await request.json();
    const emailOptions = getEmailSendOptionsFromHeaders(
      request.headers.get('x-email-test-mode'),
      request.headers.get('x-test-email-address')
    );

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Initialize Supabase with service role key for backend operations
    const supabase = createServiceClient();

    // Use admin API to generate a magiclink
    // This works for both new and existing users without requiring a password
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`
      }
    });

    if (error) {
      console.error('Magic link generation error:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Magic link generated successfully for:', email);

    const resetLink = data?.properties?.action_link;

    if (!resetLink) {
      return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 });
    }

    // Send professional email with link
    const success = await sendPasswordResetEmail(
      email,
      staffName || 'Staff Member',
      resetLink,
      emailOptions
    );

    if (!success) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Password setup link sent to ${email}` 
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
