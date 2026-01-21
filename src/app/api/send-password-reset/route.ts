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

    // Check if user exists in Auth
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let resetLink;

    if (!existingUser) {
      // Create new user with temporary password, email auto-confirmed
      const tempPassword = Math.random().toString(36).slice(-16);
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true
      });

      if (createError) {
        console.error('User creation error:', createError);
        return NextResponse.json({ error: `Failed to create user: ${createError.message}` }, { status: 500 });
      }

      // Generate recovery link for them to set their password
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?type=recovery`
        }
      });

      if (linkError) {
        console.error('Recovery link error:', linkError);
        return NextResponse.json({ error: `Failed to generate reset link: ${linkError.message}` }, { status: 500 });
      }

      resetLink = linkData?.properties?.action_link;
    } else {
      // User exists, generate recovery link
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?type=recovery`
        }
      });

      if (error) {
        console.error('Recovery link error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      resetLink = data?.properties?.action_link;
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
