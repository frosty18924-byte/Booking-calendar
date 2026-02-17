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
      .select('role_tier, managed_houses, location')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    let locations: any[] = [];

    if (userProfile.role_tier === 'admin') {
      // Admins see all locations
      const { data } = await supabase
        .from('locations')
        .select('id, name')
        .order('name');
      locations = data || [];
    } else if (userProfile.role_tier === 'manager' || userProfile.role_tier === 'scheduler') {
      // Managers/schedulers can see explicitly managed houses + their linked staff locations.
      const locationMap = new Map<string, { id: string; name: string }>();

      // Existing staff_locations links
      const { data: linkedLocations } = await supabase
        .from('staff_locations')
        .select('location_id, locations(id, name)')
        .eq('staff_id', user.id);

      (linkedLocations || []).forEach((sl: any) => {
        if (sl.locations?.id && sl.locations?.name) {
          locationMap.set(sl.locations.id, sl.locations);
        }
      });

      // Managed house names from profile
      const managedNames = new Set<string>();
      if (Array.isArray(userProfile.managed_houses)) {
        userProfile.managed_houses.forEach((name: any) => {
          if (typeof name === 'string' && name.trim()) {
            managedNames.add(name.trim());
          }
        });
      }
      if (typeof userProfile.location === 'string' && userProfile.location.trim()) {
        managedNames.add(userProfile.location.trim());
      }

      if (managedNames.size > 0) {
        const { data: managedLocations } = await supabase
          .from('locations')
          .select('id, name')
          .in('name', Array.from(managedNames));

        (managedLocations || []).forEach((loc: any) => {
          if (loc.id && loc.name) {
            locationMap.set(loc.id, loc);
          }
        });
      }

      locations = Array.from(locationMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Staff get their own location
      const { data } = await supabase
        .from('staff_locations')
        .select('locations(id, name)')
        .eq('staff_id', user.id)
        .limit(1);

      locations = data?.map(sl => sl.locations).filter(Boolean) || [];
    }

    return NextResponse.json({
      locations,
      count: locations.length,
      userRole: userProfile.role_tier
    });
  } catch (error) {
    console.error('Error in user locations endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
