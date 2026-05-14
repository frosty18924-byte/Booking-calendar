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

    // Initialize Supabase with service role key for admin operations
    const supabase = createServiceClient();

    // Derive the app base URL from the incoming request so it works correctly
    // in both local dev AND production without needing NEXT_PUBLIC_APP_URL set.
    const requestUrl = new URL(request.url);
    const appBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `${requestUrl.protocol}//${requestUrl.host}`;

    // Use admin API to generate a recovery link.
    // Because this is generated server-side, it uses Implicit Flow (hash fragment)
    // rather than PKCE (query param code). Server routes cannot read hash fragments,
    // so we MUST redirect directly to the client-side reset page where the browser
    // Supabase client can parse the hash.
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${appBaseUrl}/auth/reset-password`
      }
    });

    if (error) {
      console.error('Recovery link generation error:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Recovery link generated for:', email, '| redirectTo base:', appBaseUrl);

    const resetLink = data?.properties?.action_link;

    if (!resetLink) {
      return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 });
    }

    // Send password reset email.
    // Respects EMAIL_TEST_MODE — while testing this will route to the test inbox.
    // Set EMAIL_TEST_MODE=false in your env when you're ready to go live.
    const success = await sendPasswordResetEmail(
      email,
      staffName || 'Staff Member',
      resetLink,
      emailOptions
    );

    // In local development, Gmail SMTP is blocked by Google for non-server IPs
    // even with a valid App Password. Rather than returning a 500 that blocks
    // testing, we return success with the link so you can use it directly.
    // The link is also printed to the terminal by the email library fallback.
    if (!success && process.env.NODE_ENV === 'development') {
      console.log('\n✅ DEV MODE: Email send failed (Gmail blocks local SMTP) but link was generated:');
      console.log('🔗 Reset link:', resetLink);
      console.log('📋 Copy the link above and paste it in your browser to test.\n');
      return NextResponse.json({
        success: true,
        message: `[DEV] Email could not send via Gmail locally. Reset link logged to terminal — check your server console.`,
        devResetLink: resetLink,
      });
    }

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
