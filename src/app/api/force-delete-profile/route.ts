import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const body = await request.json();
    const { profileId, email } = body;

    if (!profileId && !email) {
      return Response.json(
        { error: 'Must provide either profileId or email' },
        { status: 400 }
      );
    }

    console.log('Force deleting profile - ID:', profileId, 'Email:', email);

    // Delete bookings first
    if (profileId) {
      const { error: bookingsError } = await supabaseAdmin
        .from('bookings')
        .delete()
        .eq('profile_id', profileId);
      
      console.log('Bookings deleted for profile:', profileId, 'Error:', bookingsError?.message);
    }

    // Delete profile
    let deleteError;
    if (profileId) {
      const { error } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', profileId);
      deleteError = error;
    } else if (email) {
      const { error } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('email', email);
      deleteError = error;
    }

    if (deleteError) {
      console.error('Profile deletion error:', deleteError);
      return Response.json(
        { error: `Failed to delete profile: ${deleteError.message}` },
        { status: 400 }
      );
    }

    console.log('Profile force deleted successfully');
    return Response.json({ success: true, message: 'Profile deleted' });
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
