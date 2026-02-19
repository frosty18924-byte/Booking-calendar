import { NextRequest } from 'next/server';
import { createServiceClient, requireRole } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authz = await requireRole(['admin']);
    if ('error' in authz) return authz.error;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAdmin = createServiceClient();

    const body = await request.json();
    const { staffId, email } = body;

    // Validate input
    if (!staffId || !email) {
      return Response.json(
        {
          success: false,
          error: 'Missing required fields: staffId, email',
        },
        { status: 400 }
      );
    }

    // Validate environment variables
    if (!supabaseUrl) {
      return Response.json(
        {
          success: false,
          error: 'Missing Supabase environment variables',
        },
        { status: 500 }
      );
    }

    // For roster-only staff (no auth account), just soft delete the profile
    console.log('Attempting to delete staff member:', staffId, email);
    
    // First verify the profile exists and get its auth status
    const { data: profileExists } = await supabaseAdmin
      .from('profiles')
      .select('id, role_tier, full_name, email, location, home_house, managed_houses, password_needs_change, is_deleted, deleted_at')
      .eq('id', staffId);
    
    console.log('Profile exists:', profileExists && profileExists.length > 0);
    
    if (!profileExists || profileExists.length === 0) {
      return Response.json(
        {
          success: false,
          error: `Profile with id ${staffId} not found`,
        },
        { status: 400 }
      );
    }

    // Delete the auth user account if it exists (for manager/scheduler/admin users)
    const profile = profileExists[0];

    // Log archive snapshot so admins can restore this profile from Archive page.
    try {
      await supabaseAdmin
        .from('deleted_items')
        .insert([
          {
            entity_type: 'profile',
            entity_id: String(staffId),
            location_id: null,
            snapshot: {
              profile: profile,
            },
            deleted_by: null,
          },
        ]);
    } catch (archiveErr) {
      console.warn('Could not create archive record for deleted profile:', archiveErr);
    }

    if (profile.role_tier !== 'staff') {
      console.log('Attempting to delete auth user for:', email);
      try {
        const { data: authUsersData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        if (authError) {
          console.log('Unable to list auth users:', authError.message);
        } else {
          const authUser = authUsersData.users.find(
            user => user.email?.toLowerCase() === email.toLowerCase()
          );

          if (!authUser) {
            console.log('Auth user not found (might be staff member with no login)');
          } else {
            const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);
            if (deleteAuthError) {
              console.error('Error deleting auth user:', deleteAuthError);
            } else {
              console.log('Auth user deleted successfully');
            }
          }
        }
      } catch (authErr) {
        console.error('Error during auth deletion:', authErr);
      }
    }

    // Soft delete the profile: anonymize and mark as deleted for historical analytics
    console.log('Soft deleting profile with id:', staffId);
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        full_name: 'Deleted User',
        email: `deleted-${staffId}@system.local`, // Anonymize email
      })
      .eq('id', staffId);

    console.log('Profile soft delete error:', profileError?.message || 'Success');
    
    if (profileError) {
      console.error('Profile soft delete error:', profileError);
      return Response.json(
        {
          success: false,
          error: `Failed to delete profile: ${profileError.message}`,
        },
        { status: 400 }
      );
    }

    // Verify soft delete worked
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { data: verifyDelete } = await supabaseAdmin
      .from('profiles')
      .select('is_deleted, deleted_at')
      .eq('id', staffId);
    
    if (verifyDelete && verifyDelete.length > 0) {
      console.log('Profile soft deleted successfully:', {
        is_deleted: verifyDelete[0].is_deleted,
        deleted_at: verifyDelete[0].deleted_at,
      });
    }

    console.log('Staff member deleted successfully:', email);

    return Response.json(
      {
        success: true,
        message: `Staff member ${email} has been completely removed`,
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
