import { createClient } from '@supabase/supabase-js';
import { sendPasswordResetEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

interface StaffMember {
  full_name: string;
  email: string;
  location: string;
  role_tier: 'staff' | 'scheduler' | 'admin';
  password?: string; // Optional: if not provided, will generate one
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
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
        
        // Check if email already exists in profiles
        const { data: existingProfile, error: checkError } = await supabaseAdmin
          .from('profiles')
          .select('id, email')
          .eq('email', staff.email.toLowerCase())
          .single();

        if (existingProfile) {
          console.warn('User already exists in profiles:', staff.email);
          results.push({
            email: staff.email,
            success: false,
            error: `User with email ${staff.email} already exists`,
          });
          continue;
        }

        // Check if auth user already exists
        const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
        const existingAuthUser = users?.find(u => u.email?.toLowerCase() === staff.email.toLowerCase());

        if (existingAuthUser) {
          console.warn('Auth user exists but no profile, attempting to create profile:', staff.email);
          // Create profile for existing auth user
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert([
              {
                id: existingAuthUser.id,
                full_name: staff.full_name,
                email: staff.email,
                location: staff.location,
                role_tier: staff.role_tier,
                password_needs_change: false,
              },
            ]);

          if (profileError) {
            console.error('Profile creation error for existing auth user:', profileError);
            results.push({
              email: staff.email,
              success: false,
              error: `Auth user exists but couldn't create profile: ${profileError.message}`,
            });
            continue;
          }

          results.push({
            email: staff.email,
            success: true,
            message: 'Profile created for existing auth user',
          });
          continue;
        }

        // Use provided password or generate one
        const userPassword = staff.password || (Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-4));
        
        // Create auth user with service role
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: staff.email,
          password: userPassword,
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

        // Insert profile with the user ID - include password_needs_change flag if password was provided
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              full_name: staff.full_name,
              email: staff.email,
              location: staff.location,
              role_tier: staff.role_tier,
              password_needs_change: staff.password ? true : false, // Force change only if custom password was set
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

        // Only generate reset link if no custom password was provided
        if (!staff.password) {
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
            });
            continue;
          }

          // Send password reset email
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
            message: 'User created and password reset email sent',
          });
        } else {
          // Custom password was set, user will need to change it on first login
          results.push({
            email: staff.email,
            success: true,
            message: 'User created with custom password. They must change it on first login.',
            password: userPassword,
          });
        }
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
