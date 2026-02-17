import { createClient } from '@supabase/supabase-js';
import { sendPasswordResetEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

interface StaffMember {
  full_name: string;
  email: string;
  location: string;
  location_id?: string;
  role_tier: 'staff' | 'scheduler' | 'manager' | 'admin';
  password?: string;
}

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test((value || '').trim());

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
        console.log('Adding staff member:', staff.email);
        console.log('Staff data:', JSON.stringify(staff));
        
        // Check if email already exists in profiles
        const emailToCheck = staff.email.toLowerCase();
        const { data: existingProfiles, error: checkError } = await supabaseAdmin
          .from('profiles')
          .select('id, email, is_deleted')
          .eq('email', emailToCheck);

        if (checkError) {
          console.error('Error checking existing profiles:', checkError);
          results.push({
            email: staff.email,
            success: false,
            error: `Failed to check existing profiles: ${checkError.message}`,
          });
          continue;
        }

        // Allow re-adding deleted staff with same email
        const activeProfile = existingProfiles?.find(p => !p.is_deleted);
        if (activeProfile) {
          console.warn('Staff already exists:', staff.email);
          results.push({
            email: staff.email,
            success: false,
            error: `Staff member with email ${staff.email} already exists`,
          });
          continue;
        }

        // Normalize incoming location values so profile.location stores a human-readable name
        // and staff_locations always gets a real location UUID.
        let normalizedLocationId = '';
        let normalizedLocationName = '';

        if (staff.location_id && isUuid(staff.location_id)) {
          normalizedLocationId = staff.location_id;
          const { data: byId } = await supabaseAdmin
            .from('locations')
            .select('id, name')
            .eq('id', staff.location_id)
            .maybeSingle();
          normalizedLocationName = byId?.name || '';
        }

        if (!normalizedLocationId && isUuid(staff.location)) {
          normalizedLocationId = staff.location;
          const { data: byId } = await supabaseAdmin
            .from('locations')
            .select('id, name')
            .eq('id', staff.location)
            .maybeSingle();
          normalizedLocationName = byId?.name || '';
        }

        if (!normalizedLocationId || !normalizedLocationName) {
          const locationNameInput = (staff.location || '').trim();
          const { data: byName } = await supabaseAdmin
            .from('locations')
            .select('id, name')
            .eq('name', locationNameInput)
            .maybeSingle();

          if (byName) {
            normalizedLocationId = byName.id;
            normalizedLocationName = byName.name;
          }
        }

        if (!normalizedLocationId || !normalizedLocationName) {
          results.push({
            email: staff.email,
            success: false,
            error: `Invalid location provided for ${staff.full_name}. Please select a valid location.`,
          });
          continue;
        }

        // Staff are roster-only. Non-staff require a real auth account for login.
        let profileId = crypto.randomUUID();
        let createdAuthUserId: string | null = null;
        const providedPassword = (staff.password || '').trim();
        const needsLogin = staff.role_tier !== 'staff';

        if (needsLogin) {
          const initialPassword = providedPassword || `Temp-${crypto.randomUUID()}Aa1!`;
          const { data: createdAuth, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
            email: emailToCheck,
            password: initialPassword,
            email_confirm: true,
            user_metadata: {
              full_name: staff.full_name,
            },
          });

          if (createAuthError || !createdAuth?.user?.id) {
            results.push({
              email: staff.email,
              success: false,
              error: `Failed to create login account: ${createAuthError?.message || 'Unknown auth error'}`,
            });
            continue;
          }

          createdAuthUserId = createdAuth.user.id;
          profileId = createdAuth.user.id;
        }
        
        console.log('Creating roster-only profile for:', staff.email, 'with ID:', profileId);
        
        // Create profile only (no auth user)
        const { error: profileError, data: profileData } = await supabaseAdmin
          .from('profiles')
          .insert([
            {
              id: profileId,
              full_name: staff.full_name,
              email: emailToCheck,
              location: normalizedLocationName,
              role_tier: staff.role_tier,
              password_needs_change: needsLogin,
              is_deleted: false,
            },
          ])
          .select();

        if (profileError) {
          console.error('Profile creation error:', profileError);
          if (createdAuthUserId) {
            await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
          }
          results.push({
            email: staff.email,
            success: false,
            error: `Failed to create profile: ${profileError.message}`,
          });
          continue;
        }

        // Add staff to staff_locations so they appear in training matrix
        const { error: staffLocError } = await supabaseAdmin
          .from('staff_locations')
          .insert([
            {
              staff_id: profileId,
              location_id: normalizedLocationId,
            },
          ]);

        if (staffLocError) {
          console.error('Error adding to staff_locations:', staffLocError);
          // Don't fail the whole operation if this fails, just log it
          console.warn('Staff member added to profiles but not staff_locations. They may not appear in training matrix.');
        }

        // For login-enabled users with no provided password, send password setup link.
        if (needsLogin && !providedPassword) {
          try {
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
              type: 'magiclink',
              email: emailToCheck,
              options: {
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
              },
            });

            if (!linkError && linkData?.properties?.action_link) {
              await sendPasswordResetEmail(
                emailToCheck,
                staff.full_name,
                linkData.properties.action_link
              );
            } else {
              console.warn('Could not generate password setup link:', linkError?.message);
            }
          } catch (linkErr) {
            console.warn('Could not send password setup email:', linkErr);
          }
        }

        console.log('Staff member added successfully:', staff.email);
        results.push({
          email: staff.email,
          success: true,
          message: needsLogin
            ? `${staff.full_name} created with login access`
            : `${staff.full_name} added to roster and training matrix`,
        });
      } catch (error: any) {
        console.error('Error adding staff:', error);
        results.push({
          email: staff.email,
          success: false,
          error: error.message || 'Unknown error',
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
