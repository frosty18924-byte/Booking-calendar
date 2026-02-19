import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, requireRole } from '@/lib/apiAuth';

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

function canonicalCourseName(name?: string | null): string {
  if (!name) return '';
  return name.replace(/\s+\(Careskills\)\s*$/i, '').replace(/\s+/g, ' ').trim().toLowerCase();
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

async function fetchAllRows(
  supabase: any,
  table: string,
  selectClause: string,
  applyFilters?: (query: any) => any
): Promise<{ data: any[] | null; error: any | null }> {
  const pageSize = 1000;
  let from = 0;
  const allRows: any[] = [];

  while (true) {
    let query = supabase.from(table).select(selectClause);
    if (applyFilters) query = applyFilters(query);
    query = query.range(from, from + pageSize - 1);

    const { data, error } = await query;
    if (error) return { data: null, error };

    const rows = data || [];
    allRows.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return { data: allRows, error: null };
}

export async function GET(request: NextRequest) {
  try {
    const authz = await requireRole(['admin', 'scheduler', 'manager', 'staff']);
    if ('error' in authz) return authz.error;

    const { searchParams } = new URL(request.url);
    const locationFilter = searchParams.get('locationFilter');

    // Use service client after role-gate; RLS on these tables now requires auth context.
    const supabase = createServiceClient();

    const { data: awaitingCourses, error } = await fetchAllRows(
      supabase,
      'staff_training_matrix',
      `
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
      `,
      (query) => {
        let scoped = query.eq('status', 'awaiting');
        if (locationFilter) scoped = scoped.eq('completed_at_location_id', locationFilter);
        return scoped;
      }
    );

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch awaiting training courses' },
        { status: 500 }
      );
    }

    const { data: locationCourseLinks, error: locationCourseError } = await fetchAllRows(
      supabase,
      'location_training_courses',
      'location_id, training_course_id, training_courses(name)',
      (query) => (locationFilter ? query.eq('location_id', locationFilter) : query)
    );
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
    const validLocationCourseNames = new Set(
      (locationCourseLinks || [])
        .map((link: any) => {
          const linkedCourse = Array.isArray(link.training_courses) ? link.training_courses[0] : link.training_courses;
          const normalizedName = canonicalCourseName(linkedCourse?.name);
          if (!normalizedName || !link.location_id) return null;
          return `${link.location_id}::${normalizedName}`;
        })
        .filter((key): key is string => Boolean(key))
    );

    const { data: trainingCourses, error: trainingCoursesError } = await fetchAllRows(
      supabase,
      'training_courses',
      'id, name'
    );
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
        const course = record.training_courses as { name?: string } | null;
        const nameKey = record.completed_at_location_id
          ? `${record.completed_at_location_id}::${canonicalCourseName(course?.name)}`
          : null;
        return Boolean(
          (primaryKey && validLocationCourseKeys.has(primaryKey))
          || (aliasKey && validLocationCourseKeys.has(aliasKey))
          || (nameKey && validLocationCourseNames.has(nameKey))
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
