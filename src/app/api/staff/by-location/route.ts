import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get the user's authentication token
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create authenticated client
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

    const { data: { user }, error: userError } = await authClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role_tier')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    let query = supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        role_tier,
        staff_locations (
          location_id,
          locations (id, name)
        )
      `);

    // Apply location filtering
    if (userProfile.role_tier === 'admin') {
      // Admins see all staff
    } else if (userProfile.role_tier === 'manager' || userProfile.role_tier === 'scheduler') {
      // Get locations this user manages
      const { data: managedLocations } = await supabase
        .from('staff_locations')
        .select('location_id')
        .eq('staff_id', user.id);

      const locationIds = managedLocations?.map(ml => ml.location_id) || [];

      if (locationIds.length === 0) {
        return NextResponse.json({ staff: [] });
      }

      // Get staff assigned to these locations
      const { data: staffAtLocations } = await supabase
        .from('staff_locations')
        .select('staff_id')
        .in('location_id', locationIds);

      const staffIds = staffAtLocations?.map(sl => sl.staff_id) || [];
      
      if (staffIds.length === 0) {
        return NextResponse.json({ staff: [] });
      }

      query = query.in('id', staffIds);
    } else {
      // Staff can only see themselves
      query = query.eq('id', user.id);
    }

    const { data: staff, error } = await query;

    if (error) {
      console.error('Error fetching staff:', error);
      return NextResponse.json(
        { error: 'Failed to fetch staff' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      staff: staff || [],
      count: staff?.length || 0,
      userRole: userProfile.role_tier
    });
  } catch (error) {
    console.error('Error in staff by location endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
