import { NextRequest } from 'next/server';
import { createServiceClient, requireRole } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

type FutureBooking = {
  id: string;
  event_id: string;
  profile_id: string;
  attended_at: string | null;
  lateness_reason: string | null;
  lateness_minutes: number | null;
  absence_reason: string | null;
  booked_by: string | null;
  created_at: string | null;
  is_late: boolean | null;
  late_reason: string | null;
  minutes_late: number | null;
};

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
      .select('id, role_tier, full_name, email, phone_number, avatar_path, location, home_house, managed_houses, password_needs_change, is_deleted, deleted_at')
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

    // Soft-disable login access rather than hard-deleting the auth record.
    const profile = profileExists[0];
    const todayIsoDate = new Date().toISOString().split('T')[0];
    const deletedAt = new Date().toISOString();
    const deletedEmail = `deleted-${staffId}@system.local`;
    let removedFutureBookings = 0;

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

    console.log('Attempting to soft-disable auth user for:', email);
    try {
      const { data: authUsersData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (authError) {
        console.log('Unable to list auth users:', authError.message);
      } else {
        const authUser = authUsersData.users.find(
          user => user.id === staffId || user.email?.toLowerCase() === email.toLowerCase()
        );

        if (!authUser) {
          console.log('Auth user not found (might be roster-only staff with no login)');
        } else {
          const { error: disableAuthError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
            email: deletedEmail,
            password: crypto.randomUUID(),
            user_metadata: {
              ...(authUser.user_metadata || {}),
              soft_deleted: true,
              deleted_at: deletedAt,
            },
            ban_duration: '876000h',
          });

          if (disableAuthError) {
            console.error('Error soft-disabling auth user:', disableAuthError);
          } else {
            console.log('Auth user soft-disabled successfully');
          }
        }
      }
    } catch (authErr) {
      console.error('Error during auth soft delete:', authErr);
    }

    // Remove only FUTURE bookings so past rosters remain historically accurate.
    // We archive each removed booking so admins can restore if needed.
    try {
      const { data: futureBookings, error: futureBookingsError } = await supabaseAdmin
        .from('bookings')
        .select(`
          id,
          event_id,
          profile_id,
          attended_at,
          lateness_reason,
          lateness_minutes,
          absence_reason,
          booked_by,
          created_at,
          is_late,
          late_reason,
          minutes_late,
          training_events!inner(
            event_date
          )
        `)
        .eq('profile_id', staffId)
        .gte('training_events.event_date', todayIsoDate);

      if (futureBookingsError) {
        console.warn('Could not query future bookings for deleted profile:', futureBookingsError.message);
      } else if (futureBookings && futureBookings.length > 0) {
        const typedFutureBookings = futureBookings as FutureBooking[];
        const bookingSnapshots = typedFutureBookings.map((booking) => ({
          entity_type: 'booking',
          entity_id: String(booking.id),
          location_id: null,
          snapshot: {
            booking: {
              id: booking.id,
              event_id: booking.event_id,
              profile_id: booking.profile_id,
              attended_at: booking.attended_at ?? null,
              lateness_reason: booking.lateness_reason ?? null,
              lateness_minutes: booking.lateness_minutes ?? null,
              absence_reason: booking.absence_reason ?? null,
              booked_by: booking.booked_by ?? null,
              created_at: booking.created_at ?? null,
              is_late: booking.is_late ?? null,
              late_reason: booking.late_reason ?? null,
              minutes_late: booking.minutes_late ?? null,
            },
          },
          deleted_by: null,
        }));

        const { error: archiveBookingsError } = await supabaseAdmin
          .from('deleted_items')
          .insert(bookingSnapshots);

        if (archiveBookingsError) {
          console.warn('Could not archive future bookings before deletion:', archiveBookingsError.message);
        }

        const bookingIdsToDelete = typedFutureBookings.map((booking) => booking.id);
        const { error: deleteFutureBookingsError } = await supabaseAdmin
          .from('bookings')
          .delete()
          .in('id', bookingIdsToDelete);

        if (deleteFutureBookingsError) {
          console.warn('Could not delete future bookings for deleted profile:', deleteFutureBookingsError.message);
        } else {
          removedFutureBookings = bookingIdsToDelete.length;
        }
      }
    } catch (futureBookingCleanupErr) {
      console.warn('Future booking cleanup failed during staff deletion:', futureBookingCleanupErr);
    }

    // Soft delete the profile while preserving full_name for historical roster display
    console.log('Soft deleting profile with id:', staffId);
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_deleted: true,
        deleted_at: deletedAt,
        email: deletedEmail, // Anonymize active login email while keeping a restorable archive snapshot
        password_needs_change: true,
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
        message: `Staff member removed. ${removedFutureBookings} future booking(s) were removed; historical rosters were kept.`,
        removedFutureBookings,
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
