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
  awaitingTrainingDate?: boolean;
  isOneOff?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const locationFilter = searchParams.get('locationFilter');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    // Query: Get all training records with expiry_dates between startDate and endDate
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
        courses(name, category, expiry_months),
        locations(name)
      `)
      .gte('expiry_date', startDate)
      .lte('expiry_date', endDate)
      .not('expiry_date', 'is', null); // Only include records with expiry dates

    // Apply location filter if provided
    if (locationFilter) {
      query = query.eq('completed_at_location_id', locationFilter);
    }

    const { data: expiringCourses, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch expiring courses' },
        { status: 500 }
      );
    }

    // Transform data
    const formattedData: CourseData[] = (expiringCourses || [])
      .map(record => {
        const isOneOff = !record.courses?.expiry_months || record.courses.expiry_months === 9999;
        const expiryDate = new Date(record.expiry_date);
        
        return {
          name: record.profiles?.full_name || 'Unknown',
          course: record.courses?.name || 'Unknown Course',
          expiry: record.expiry_date,
          expiryTime: expiryDate.getTime(),
          location: record.locations?.name || 'Unknown Location',
          delivery: record.courses?.category || 'Standard',
          isOneOff,
        };
      });

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching expiring courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
