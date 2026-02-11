import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    if (!locationId) {
      return NextResponse.json(
        { error: 'locationId parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get courses for this location with proper ordering
    const { data: locationCourses, error } = await supabase
      .from('location_courses')
      .select(`
        id,
        display_order,
        courses (
          id,
          name,
          expiry_months,
          category,
          display_order as course_display_order
        )
      `)
      .eq('location_id', locationId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching location courses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch courses for location' },
        { status: 500 }
      );
    }

    // Extract and format the courses
    const courses = (locationCourses || [])
      .map((lc: any) => lc.courses)
      .filter((c: any) => c !== null);

    return NextResponse.json({
      locationId,
      courses,
      count: courses.length
    });
  } catch (error) {
    console.error('Error in courses/by-location endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
