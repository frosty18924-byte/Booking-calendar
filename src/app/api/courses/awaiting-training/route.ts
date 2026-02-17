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

function buildLocationCourseKey(locationId?: string | null, courseId?: string | null): string | null {
  if (!locationId || !courseId) return null;
  return `${locationId}::${courseId}`;
}

function buildCareskillsAliasMap(courses: Array<{ id?: string; name?: string }>): Map<string, string> {
  const baseByName = new Map<string, string>();
  const aliasMap = new Map<string, string>();

  for (const course of courses) {
    if (!course?.id || !course?.name) continue;
    const name = course.name.trim();
    if (!name.includes('(Careskills)')) {
      baseByName.set(name.toLowerCase(), course.id);
    }
  }

  for (const course of courses) {
    if (!course?.id || !course?.name) continue;
    const name = course.name.trim();
    if (!name.includes('(Careskills)')) continue;
    const baseName = name.replace(' (Careskills)', '').trim().toLowerCase();
    const baseId = baseByName.get(baseName);
    if (baseId) {
      aliasMap.set(course.id, baseId);
    }
  }

  return aliasMap;
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

    let locationCourseQuery = supabase
      .from('location_training_courses')
      .select('location_id, training_course_id');

    if (locationFilter) {
      locationCourseQuery = locationCourseQuery.eq('location_id', locationFilter);
    }

    const { data: locationCourseLinks, error: locationCourseError } = await locationCourseQuery;
    if (locationCourseError) {
      console.error('Supabase error fetching location-course links:', locationCourseError);
      return NextResponse.json(
        { error: 'Failed to validate location courses' },
        { status: 500 }
      );
    }

    const validLocationCourseKeys = new Set(
      (locationCourseLinks || [])
        .map((link: any) => buildLocationCourseKey(link.location_id, link.training_course_id))
        .filter((key): key is string => Boolean(key))
    );

    const { data: trainingCourses, error: trainingCoursesError } = await supabase
      .from('training_courses')
      .select('id, name');
    if (trainingCoursesError) {
      console.error('Supabase error fetching course aliases:', trainingCoursesError);
      return NextResponse.json(
        { error: 'Failed to validate course aliases' },
        { status: 500 }
      );
    }
    const careskillsAliasMap = buildCareskillsAliasMap(trainingCourses || []);

    // Transform data
    const formattedData: CourseData[] = (awaitingCourses || [])
      .filter((record: any) => {
        const primaryKey = buildLocationCourseKey(record.completed_at_location_id, record.course_id);
        const baseCourseId = careskillsAliasMap.get(record.course_id);
        const aliasKey = baseCourseId
          ? buildLocationCourseKey(record.completed_at_location_id, baseCourseId)
          : null;
        return Boolean(
          (primaryKey && validLocationCourseKeys.has(primaryKey))
          || (aliasKey && validLocationCourseKeys.has(aliasKey))
        );
      })
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
