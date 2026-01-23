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
        console.log('Staff data received:', JSON.stringify(staff));
        console.log('Password provided?', !!staff.password, 'Password value:', staff.password);
        
        // Check if email already exists in profiles
        const emailToCheck = staff.email.toLowerCase();
        console.log('Checking for profile with email:', emailToCheck);
        
        const { data: existingProfiles, error: checkError } = await supabaseAdmin
          .from('profiles')
          .select('id, email')
          .eq('email', emailToCheck);

        console.log('Profile check result - Found:', existingProfiles?.length || 0, 'Error:', checkError?.message);
        
        if (existingProfiles && existingProfiles.length > 0) {
          const existingProfile = existingProfiles[0];
          console.warn('User already exists in profiles:', staff.email);
          console.warn('Existing profile details - ID:', existingProfile.id, 'Email:', existingProfile.email, 'Email length:', existingProfile.email?.length);
          results.push({
            email: staff.email,
            success: false,
            error: `User with email ${staff.email} already exists`,
          });
          continue;
        }

        // Check if auth user already exists
        console.log('Checking for existing auth user with email:', staff.email.toLowerCase());
        const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (usersError) {
          console.error('Error listing users:', usersError);
          results.push({
            email: staff.email,
            success: false,
            error: `Failed to check existing users: ${usersError.message}`,
          });
          continue;
        }
        
        console.log('Total auth users found:', users?.length);
        const existingAuthUser = users?.find(u => u.email?.toLowerCase() === staff.email.toLowerCase());
        console.log('Existing auth user found:', !!existingAuthUser, 'User ID:', existingAuthUser?.id);

        if (existingAuthUser) {
          console.warn('Auth user exists but no profile, attempting to create profile:', staff.email);
          
          // Double-check that profile doesn't exist for this auth user
          const { data: checkProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', existingAuthUser.id);
          
          if (checkProfile && checkProfile.length > 0) {
            console.warn('Profile already exists for this auth user:', existingAuthUser.id);
            results.push({
              email: staff.email,
              success: false,
              error: `Profile already exists for this user`,
            });
            continue;
          }
          
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

        // Wait for the on_auth_user_created trigger to create a default profile
        // Increase delay to ensure trigger completes
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if profile was auto-created by trigger
        const { data: existingProfile, error: authCheckError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id);

        console.log('Profile check after auth creation - exists:', existingProfile?.length > 0);
        if (existingProfile && existingProfile.length > 0) {
          console.log('Existing profile data:', JSON.stringify(existingProfile[0]));
        }

        // Include password_needs_change flag if password was provided
        const passwordNeedsChange = staff.password ? true : false;
        console.log('Setting password_needs_change to:', passwordNeedsChange, 'for', staff.email);
        
        const profileData = {
          full_name: staff.full_name,
          email: staff.email,
          location: staff.location,
          role_tier: staff.role_tier,
          password_needs_change: passwordNeedsChange,
        };

        console.log('Profile data to save:', JSON.stringify(profileData));

        let profileError = null;

        // If profile already exists (created by trigger), update it; otherwise insert
        if (existingProfile && existingProfile.length > 0) {
          console.log('Profile already exists, UPDATING with provided data for ID:', authData.user.id);
          const { error, data } = await supabaseAdmin
            .from('profiles')
            .update(profileData)
            .eq('id', authData.user.id)
            .select();
          profileError = error;
          console.log('Update result - error:', error?.message || 'Success', 'rows affected:', data?.length || 0);
        } else {
          console.log('Profile does not exist, INSERTING new profile for ID:', authData.user.id);
          const { error, data } = await supabaseAdmin
            .from('profiles')
            .insert([
              {
                id: authData.user.id,
                ...profileData,
              },
            ])
            .select();
          profileError = error;
          console.log('Insert result - error:', error?.message || 'Success', 'rows inserted:', data?.length || 0);
        }

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
