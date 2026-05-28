import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * Optimized parallel data fetching with caching
 * Reduces multiple sequential queries to a single parallel batch
 */
export async function fetchUserDataOptimized(userId: string) {
  try {
    // Fetch user profile and locations in parallel
    const [profileResult, locationsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, role_tier, full_name, email, phone_number, avatar_path')
        .eq('id', userId)
        .single(),
      supabase
        .from('staff_locations')
        .select('location_id, locations(id, name)')
        .eq('staff_id', userId),
    ]);

    if (profileResult.error) throw profileResult.error;

    const profile = profileResult.data;
    const locations = (locationsResult.data || [])
      .map((sl: any) => sl.locations)
      .filter(Boolean);

    return {
      profile,
      locations,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching user data:', error);
    return {
      profile: null,
      locations: [],
      error: error instanceof Error ? error.message : 'Failed to fetch user data',
    };
  }
}

/**
 * Fetch training matrix data with optimized queries
 */
export async function fetchLocationMatrixDataOptimized(locationId: string) {
  try {
    // Fetch all data in parallel
    const [staffResult, coursesResult, trainingResult, dividersResult] = await Promise.all([
      supabase
        .from('staff_locations')
        .select('staff_id, display_order, profiles(id, full_name, is_deleted)')
        .eq('location_id', locationId)
        .order('display_order', { ascending: true }),
      supabase
        .from('location_courses')
        .select('course_id, display_order, courses(id, name, category, expiry_months, never_expires)')
        .eq('location_id', locationId)
        .order('display_order', { ascending: true }),
      supabase
        .from('staff_training_matrix')
        .select('staff_id, course_id, completion_date, expiry_date, status, location_id')
        .eq('location_id', locationId),
      supabase
        .from('location_matrix_dividers')
        .select('id, name, display_order')
        .eq('location_id', locationId)
        .order('display_order', { ascending: true }),
    ]);

    if (staffResult.error) throw staffResult.error;
    if (coursesResult.error) throw coursesResult.error;
    if (trainingResult.error) throw trainingResult.error;

    return {
      staff: staffResult.data || [],
      courses: coursesResult.data || [],
      training: trainingResult.data || [],
      dividers: dividersResult.data || [],
      error: null,
    };
  } catch (error) {
    console.error('Error fetching location matrix data:', error);
    return {
      staff: [],
      courses: [],
      training: [],
      dividers: [],
      error: error instanceof Error ? error.message : 'Failed to fetch matrix data',
    };
  }
}

/**
 * Fetch all locations accessible to user
 */
export async function fetchAccessibleLocations(token?: string) {
  try {
    const response = await fetch('/api/locations/user-locations', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      locations: data.locations || [],
      error: null,
    };
  } catch (error) {
    console.error('Error fetching accessible locations:', error);
    return {
      locations: [],
      error: error instanceof Error ? error.message : 'Failed to fetch locations',
    };
  }
}

/**
 * Cache for frequently accessed data (in-memory, per session)
 */
const dataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

export function getCachedData(key: string) {
  const cached = dataCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  dataCache.delete(key);
  return null;
}

export function setCachedData(key: string, data: any) {
  dataCache.set(key, { data, timestamp: Date.now() });
}

export function clearDataCache() {
  dataCache.clear();
}
