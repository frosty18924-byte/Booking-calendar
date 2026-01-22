import { createClient } from '@supabase/supabase-js';
import { sendPasswordResetEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

interface StaffMember {
  full_name: string;
  email: string;
  location: string;
  role_tier: 'staff' | 'scheduler' | 'admin';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const staffMembers: StaffMember[] = Array.isArray(body) ? body : [body];

    // Validate environment variables
    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json(
        {
          success: false,
          error: 'Missing Supabase environment variables',
        },
        { status: 500 }
      );
    }

    // Validate input
    for (const staff of staffMembers) {
      if (!staff.full_name || !staff.email || !staff.location) {
        return Response.json(
          {
            success: false,
            error: 'Missing required fields: full_name, email, location',
          },
          { status: 400 }
        );
      }
    }

    const results = [];

    for (const staff of staffMembers) {
      try {
        console.log('Creating user for:', staff.email);
        
        // Generate a secure password (will be sent in reset email)
        const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-4);
        
        // Create auth user with service role
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: staff.email,
          password: tempPassword,
          email_confirm: true,
        });

        if (authError) {
          console.error('Auth error:', authError);
          results.push({
            email: staff.email,
            success: false,
            error: authError.message,
          });
          continue;
        }

        console.log('User created:', authData.user.id);

        // Insert profile with the user ID
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              full_name: staff.full_name,
              email: staff.email,
              location: staff.location,
              role_tier: staff.role_tier,
            },
          ]);

        if (profileError) {
          console.error('Profile error:', profileError);
          results.push({
            email: staff.email,
            success: false,
            error: profileError.message,
          });
          continue;
        }

        console.log('Profile created for:', staff.email);

        // Generate password reset link
        const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: staff.email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
          },
        });

        if (resetError) {
          console.error('Reset link generation error:', resetError);
          results.push({
            email: staff.email,
            success: true,
            message: 'User created but password reset email could not be sent',
            tempPassword: tempPassword,
          });
          continue;
        }

        // Send password reset email with temp password info
        const resetLink = resetData?.actionLink || '';
        const emailSent = await sendPasswordResetEmail(
          staff.email,
          staff.full_name,
          resetLink
        );

        if (!emailSent) {
          console.warn('Email failed to send for:', staff.email);
        }

        results.push({
          email: staff.email,
          success: true,
          tempPassword: tempPassword,
          message: 'User created and password reset email sent',
        });
      } catch (error) {
        console.error('Catch error:', error);
        results.push({
          email: staff.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return Response.json(
      {
        success: results.every((r) => r.success),
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown server error',
      },
      { status: 500 }
    );
  }
}
