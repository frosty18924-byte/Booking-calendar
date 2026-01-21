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
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const userExists = users?.some(u => u.email?.toLowerCase() === email.toLowerCase());

    let resetLink;

    if (!userExists) {
      // Invite new user - creates account and returns setup link
      console.log('Inviting new user:', email);
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?type=recovery`
      });

      if (inviteError) {
        console.error('Invite error:', inviteError);
        return NextResponse.json({ error: `Failed to invite user: ${inviteError.message}` }, { status: 500 });
      }

      resetLink = inviteData?.properties?.action_link;
      console.log('Invite link generated:', !!resetLink);
    } else {
      // User exists, generate recovery link
      console.log('Generating recovery link for existing user:', email);
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
      console.log('Recovery link generated:', !!resetLink);
    }

    if (!resetLink) {
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
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    console.log('Successfully sent setup link to:', email);
    return NextResponse.json({ 
      success: true, 
      message: `Password setup link sent to ${email}` 
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: `Internal error: ${error.message}` }, { status: 500 });
  }
}
