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

    // First, check if user exists in Auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    const userExists = users?.some(u => u.email?.toLowerCase() === email.toLowerCase());

    let resetLink;

    if (!userExists) {
      // If user doesn't exist, create them with a temporary password
      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: Math.random().toString(36).slice(-12), // Temporary random password
        email_confirm: true // Auto-confirm email
      });

      if (createError) {
        console.error('User creation error:', createError);
        // Try alternative: just generate a link for non-existent user
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: 'signup',
          email: email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?type=signup`
          }
        });

        if (linkError) {
          console.error('Link generation error:', linkError);
          return NextResponse.json({ error: `Failed to create user: ${createError.message}` }, { status: 500 });
        }

        resetLink = linkData?.properties?.action_link;
      } else {
        // User created successfully, now generate recovery link
        const { data: recoveryData, error: recoveryError } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?type=recovery`
          }
        });

        if (recoveryError) {
          console.error('Recovery link error:', recoveryError);
          return NextResponse.json({ error: recoveryError.message }, { status: 500 });
        }

        resetLink = recoveryData?.properties?.action_link;
      }
    } else {
      // User exists, generate a recovery link
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?type=recovery`
        }
      });

      if (error) {
        console.error('Supabase error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      resetLink = data?.properties?.action_link;
    }

    if (!resetLink) {
      return NextResponse.json({ error: 'Failed to generate reset link' }, { status: 500 });
    }

    // Send professional email with reset link
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
      message: `Password reset link sent to ${email}` 
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
