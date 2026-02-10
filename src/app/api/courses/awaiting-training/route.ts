import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface CourseData {
  name: string;
  course: string;
  expiry: string;
  location: string;
  delivery: string;
  awaitingTrainingDate: boolean;
  isOneOff: boolean;
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

    // Query: Get all training records with "awaiting" status
    let query = supabase
      .from('staff_training_matrix')
      .select(`
        id,
        staff_id,
        course_id,
        status,
        completion_date,
        expiry_date,
        completed_at_location_id,
        profiles(full_name),
        courses(name, category, expiry_months),
        locations(name)
      `)
      .eq('status', 'awaiting'); // Get awaiting records

    // Apply location filter if provided
    if (locationFilter) {
      query = query.eq('completed_at_location_id', locationFilter);
    }

    const { data: awaitingCourses, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch awaiting training courses' },
        { status: 500 }
      );
    }

    // Transform data
    const formattedData: CourseData[] = (awaitingCourses || []).map(record => {
      const isOneOff = !record.courses?.expiry_months || record.courses.expiry_months === 9999;
      
      return {
        name: record.profiles?.full_name || 'Unknown',
        course: record.courses?.name || 'Unknown Course',
        expiry: '-', // No expiry date for awaiting records
        location: record.locations?.name || 'Unknown Location',
        delivery: record.courses?.category || 'Standard',
        awaitingTrainingDate: true,
        isOneOff,
      };
    });

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching awaiting training courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
