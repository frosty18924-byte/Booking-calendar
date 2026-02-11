import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get the user's authentication token from the request
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create an authenticated client with the user's token
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Get current user and their role
    const { data: { user }, error: userError } = await authClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's profile to check role and location
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role_tier, id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Build query based on user role
    let query = supabase
      .from('staff_training_matrix')
      .select(`
        id,
        staff_id,
        course_id,
        completion_date,
        expiry_date,
        status,
        completed_at_location_id,
        profiles:staff_id (id, full_name),
        courses:course_id (id, name, expiry_months),
        locations:completed_at_location_id (id, name)
      `);

    // Apply location filtering based on role
    if (userProfile.role_tier === 'admin') {
      // Admins see everything - no filter needed
    } else if (userProfile.role_tier === 'manager' || userProfile.role_tier === 'scheduler') {
      // Get locations this user manages
      const { data: managedLocations } = await supabase
        .from('staff_locations')
        .select('location_id')
        .eq('staff_id', user.id);

      const locationIds = managedLocations?.map(ml => ml.location_id) || [];

      if (locationIds.length === 0) {
        return NextResponse.json([]);
      }

      query = query.in('completed_at_location_id', locationIds);
    } else {
      // Staff only see their own records
      query = query.eq('staff_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching training records:', error);
      return NextResponse.json(
        { error: 'Failed to fetch training records' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      records: data || [],
      userRole: userProfile.role_tier,
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Error in training matrix endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
