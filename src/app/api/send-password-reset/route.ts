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

    // First check if user already exists in Auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(u => u.email === email);

    let resetLink: string | undefined;

    if (userExists) {
      // For existing users, generate a recovery link
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?type=recovery`
        }
      });

      if (error) {
        console.error('Recovery link generation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      resetLink = data?.properties?.action_link;
    } else {
      // For new users, create with temporary password then generate recovery link
      const tempPassword = Math.random().toString(36).slice(-16);
      
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true // Auto-confirm email
      });

      if (createError) {
        console.error('Create user error:', JSON.stringify(createError, null, 2));
        return NextResponse.json({ error: 'Failed to create user: ' + createError.message }, { status: 500 });
      }

      console.log('User created successfully:', createData.user?.id);

      // Now generate recovery link for them to set their own password
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?type=recovery`
        }
      });

      if (error) {
        console.error('Recovery link generation error:', JSON.stringify(error, null, 2));
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      resetLink = data?.properties?.action_link;
    }

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
