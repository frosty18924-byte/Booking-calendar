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

function isDeletedProfile(profile: { full_name?: string; is_deleted?: boolean } | null): boolean {
  if (!profile) return false;
  if (profile.is_deleted) return true;
  const name = (profile.full_name || '').trim().toLowerCase();
  return name === 'deleted user' || name.startsWith('deleted-') || name.includes('deleted-duplicate');
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
        profiles(full_name, is_deleted),
        training_courses(name, expiry_months, never_expires),
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
    const formattedData: CourseData[] = (awaitingCourses || [])
      .filter((record: any) => !isDeletedProfile(record.profiles as { full_name?: string; is_deleted?: boolean } | null))
      .map((record: any) => {
        const course = record.training_courses as { name?: string; expiry_months?: number; never_expires?: boolean } | null;
        const profiles = record.profiles as { full_name?: string; is_deleted?: boolean } | null;
        const locations = record.locations as { name?: string } | null;
        const isOneOff = course?.never_expires || !course?.expiry_months || course?.expiry_months === 9999;
        
        return {
          name: profiles?.full_name || 'Unknown',
          course: course?.name || 'Unknown Course',
          expiry: '-', // No expiry date for awaiting records
          location: locations?.name || 'Unknown Location',
          delivery: 'Standard',
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
