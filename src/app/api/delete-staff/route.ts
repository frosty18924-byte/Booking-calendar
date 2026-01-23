import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

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
    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json(
        {
          success: false,
          error: 'Missing Supabase environment variables',
        },
        { status: 500 }
      );
    }

    // Delete from bookings table first (all their course assignments)
    console.log('Attempting to delete bookings for profile_id:', staffId);
    const { error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('profile_id', staffId);

    console.log('Bookings deletion error:', bookingsError);

    if (bookingsError) {
      console.error('Bookings deletion error:', bookingsError);
      return Response.json(
        {
          success: false,
          error: `Failed to delete bookings: ${bookingsError.message}`,
        },
        { status: 400 }
      );
    }

    // Delete from profiles table - use direct delete
    console.log('Attempting to delete profile with id:', staffId);
    
    // First verify the profile exists (use select without .single() to avoid error)
    const { data: profileExists } = await supabaseAdmin
      .from('profiles')
      .select('id')
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

    // Delete from profiles table
    console.log('Attempting to delete profile with id:', staffId);
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', staffId);

    console.log('Profile deletion error:', profileError);

    if (profileError) {
      console.error('Profile deletion error:', profileError);
      return Response.json(
        {
          success: false,
          error: `Failed to delete profile: ${profileError.message}`,
        },
        { status: 400 }
      );
    }

    // Delete auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(staffId);

    if (authError) {
      console.error('Auth deletion error:', authError);
      // Even if auth deletion fails, profile was already deleted
      // Return success but with warning message
      return Response.json(
        {
          success: true,
          message: 'Staff member removed from portal, but auth account deletion had an issue',
          warning: authError.message,
        },
        { status: 200 }
      );
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
