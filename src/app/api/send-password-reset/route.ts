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

    // Generate magic link for password setup/reset
    // This works for both new and existing users via OTP
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`
      }
    });

    if (error) {
      console.error('Magic link generation error:', JSON.stringify(error, null, 2));
      
      // If user doesn't exist, we need to create them first
      if ((error as any).code === 'user_not_found') {
        console.log('User not found, attempting to create with minimal data...');
        
        // Create user with minimal data - just email
        const { error: createError } = await supabase.auth.admin.createUser({
          email: email,
          password: 'temp_' + Math.random().toString(36).slice(-12),
          email_confirm: true
        });

        if (createError) {
          console.error('Create user error:', JSON.stringify(createError, null, 2));
          return NextResponse.json({ 
            error: 'Failed to create user account: ' + (createError as any).message 
          }, { status: 500 });
        }

        // Try generating link again after creating user
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`
          }
        });

        if (linkError) {
          console.error('Magic link generation after user creation failed:', JSON.stringify(linkError, null, 2));
          return NextResponse.json({ error: linkError.message }, { status: 500 });
        }

        data.properties = linkData?.properties;
      } else {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
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
