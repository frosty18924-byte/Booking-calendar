import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email, staffName } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Initialize Supabase with service role key for backend operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate recovery link - works for both new and existing users
    // Supabase will handle account creation on first use
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?type=recovery`
      }
    });

    if (error) {
      console.error('Link generation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const resetLink = data?.properties?.action_link;

    if (!resetLink) {
      return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 });
    }

    // Send professional email with link
    const success = await sendPasswordResetEmail(
      email,
      staffName || 'Staff Member',
      resetLink
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
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
