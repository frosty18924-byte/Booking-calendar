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

    // Check if user exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('List users error:', listError);
      return NextResponse.json({ error: 'Failed to check user' }, { status: 500 });
    }

    const userExists = users?.some(u => u.email?.toLowerCase() === email.toLowerCase());
    let resetLink;

    if (!userExists) {
      // Create new user
      console.log('Creating new user:', email);
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

      console.log('User created successfully:', email);
    }

    // Now generate recovery link (works after user is created)
    console.log('Generating recovery link for:', email);
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?type=recovery`
      }
    });

    if (linkError) {
      console.error('Recovery link error:', linkError);
      return NextResponse.json({ error: `Failed to generate link: ${linkError.message}` }, { status: 500 });
    }

    resetLink = linkData?.properties?.action_link;

    if (!resetLink) {
      console.error('No action link in response');
      return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 });
    }

    // Send professional email with link
    console.log('Sending email to:', email);
    const success = await sendPasswordResetEmail(
      email,
      staffName || 'Staff Member',
      resetLink
    );

    if (!success) {
      console.error('Email sending failed for:', email);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    console.log('Successfully sent password link to:', email);
    return NextResponse.json({ 
      success: true, 
      message: `Password setup link sent to ${email}` 
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: `Internal error: ${error.message}` }, { status: 500 });
  }
}
