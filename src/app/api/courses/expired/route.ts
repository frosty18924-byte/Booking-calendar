import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface CourseData {
  name: string;
  course: string;
  expiry: string;
  expiryTime?: number;
  location: string;
  delivery: string;
  expiredSince?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationFilter = searchParams.get('locationFilter');

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Query: Get all training records with expired expiry_dates
    let query = supabase
      .from('staff_training_matrix')
      .select(`
        id,
        staff_id,
        course_id,
        expiry_date,
        status,
        completed_at_location_id,
        profiles(full_name),
        training_courses(name),
        locations(name)
      `)
      .lt('expiry_date', todayStr); // expiry_date is before today

    // Apply location filter if provided
    if (locationFilter) {
      query = query.eq('completed_at_location_id', locationFilter);
    }

    const { data: expiredCourses, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch expired courses' },
        { status: 500 }
      );
    }

    // Transform data
    const formattedData: CourseData[] = (expiredCourses || [])
      .filter(record => record.expiry_date) // Only include records with expiry dates
      .map((record: any) => {
        const course = record.training_courses as { name?: string } | null;
        const profiles = record.profiles as { full_name?: string } | null;
        const locations = record.locations as { name?: string } | null;
        const expiryDate = new Date(record.expiry_date);
        const daysExpired = Math.floor((today.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          name: profiles?.full_name || 'Unknown',
          course: course?.name || 'Unknown Course',
          expiry: record.expiry_date,
          location: locations?.name || 'Unknown Location',
          delivery: 'Standard',
          expiredSince: `${daysExpired} days ago`,
        };
      });

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching expired courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
