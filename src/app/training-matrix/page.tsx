'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';
import HomeButton from '@/app/components/HomeButton';
import { parseFirstThreeRowsFromCsvString, CsvHeaderRows } from './csvHeaderUtils';

// Helper to get CSV URL for a location name (public folder)
function getCsvUrlForLocation(locationName: string): string {
  // e.g. 'Banks House School' => '/csv-import/Banks House School Training Matrix - Staff Matrix.csv'
  return `/csv-import/${locationName} Training Matrix - Staff Matrix.csv`;
}

interface TrainingRecord {
  id: string;
  staff_id: string;
  staff_name: string;
  course_id: string;
  course_name: string;
  completion_date: string | null;
  expiry_date: string | null;
  location_name: string;
}

interface Staff {
  id: string;
  name: string;
  location_id: string;
}

interface Course {
  id: string;
  name: string;
  category?: string;
  expiry_months?: number;
  never_expires?: boolean;
}

interface MatrixCell {
  completion_date: string | null;
  expiry_date: string | null;
  training_id: string | null;
  status: string | null;
}

function normalizeCourseName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().toLowerCase();
}

export default function TrainingMatrixPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [locations, setLocations] = useState<any[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [matrixData, setMatrixData] = useState<Record<string, Record<string, MatrixCell>>>({});
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const tableScrollContainerRef = useRef<HTMLDivElement>(null);
  const [editingCell, setEditingCell] = useState<{ staffId: string; courseId: string } | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'completed' | 'booked' | 'awaiting' | 'na' | null>(null);
  const [staffDividers, setStaffDividers] = useState<Set<string>>(new Set());
  const [staffOrder, setStaffOrder] = useState<Map<string, number>>(new Map());
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [draggedCourse, setDraggedCourse] = useState<string | null>(null);
  const [showAddDivider, setShowAddDivider] = useState(false);
  const [newDividerName, setNewDividerName] = useState('');
  const [draggedStaff, setDraggedStaff] = useState<string | null>(null);
  const [editingHeader, setEditingHeader] = useState<{ courseId: string; type: 'name' | 'category' | 'expiry' } | null>(null);
  const [editHeaderValue, setEditHeaderValue] = useState<string>('');
  const [showReorderCourses, setShowReorderCourses] = useState(false);
  const [courseOrderInput, setCourseOrderInput] = useState('');

  function getCategoryOverrides(locationId: string): Record<string, string> {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem('matrix_category_overrides_v1');
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, Record<string, string>>;
      return parsed[locationId] || {};
    } catch {
      return {};
    }
  }

  function saveCategoryOverride(locationId: string, courseId: string, value: string) {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('matrix_category_overrides_v1');
      const parsed = raw ? JSON.parse(raw) as Record<string, Record<string, string>> : {};
      if (!parsed[locationId]) parsed[locationId] = {};
      if (value.trim()) {
        parsed[locationId][courseId] = value.trim();
      } else {
        delete parsed[locationId][courseId];
      }
      window.localStorage.setItem('matrix_category_overrides_v1', JSON.stringify(parsed));
    } catch (error) {
      console.warn('Could not save category override:', error);
    }
  }

  function formatExpiryDisplay(months?: number, neverExpires?: boolean): string {
    // Check if course never expires (9999 months, neverExpires flag, or null months)
    if (neverExpires || months === 9999 || months === null || months === undefined) return 'One-Off';
    
    const m = months || 12;
    const years = Math.floor(m / 12);
    const remainingMonths = m % 12;
    
    if (years > 0 && remainingMonths === 0) {
      return `${years} year${years > 1 ? 's' : ''}`;
    } else if (years > 0) {
      return `${years}y ${remainingMonths}m`;
    }
    return `${m}m`;
  }

  useEffect(() => {
    checkAuth();
    checkTheme();
  }, []);

  useEffect(() => {
    const handleThemeChange = (event: any) => {
      setIsDark(event.detail.isDark);
    };
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  useEffect(() => {
    if (user && userRole) {
      fetchLocations();
    }
  }, [user, userRole]);

  useEffect(() => {
    if (!selectedLocation) return;
    fetchMatrixData();
    // After fetching matrix data, check if there are any courses for this location
    (async () => {
      const { data: locationCourses, error } = await supabase
        .from('location_training_courses')
        .select('training_course_id')
        .eq('location_id', selectedLocation);
      if (error) {
        console.warn('Error checking location courses:', error);
        return;
      }
      if (!locationCourses || locationCourses.length === 0) {
        // No courses in DB for this location, import from CSV
        const locationObj = locations.find(l => l.id === selectedLocation);
        if (locationObj && locationObj.name) {
          const csvUrl = getCsvUrlForLocation(locationObj.name);
          try {
            const res = await fetch(csvUrl);
            if (!res.ok) throw new Error('CSV not found');
            const csvContent = await res.text();
            const csvHeaders: CsvHeaderRows = parseFirstThreeRowsFromCsvString(csvContent);
            // Insert each course into training_courses and location_training_courses
            for (let idx = 0; idx < csvHeaders.courseNameRow.length; idx++) {
              const name = csvHeaders.courseNameRow[idx]?.trim();
              if (!name) continue;
              // Insert or upsert course
              const { data: course, error: courseError } = await supabase
                .from('training_courses')
                .upsert([
                  {
                    name,
                    expiry_months: parseInt(csvHeaders.expiryRow[idx]) || 12,
                    never_expires: csvHeaders.expiryRow[idx]?.toLowerCase().includes('one-off') || false,
                  },
                ], { onConflict: 'name' })
                .select()
                .single();
              if (courseError) {
                console.warn('Error upserting course', name, courseError);
                continue;
              }
              // Insert into location_training_courses
              await supabase
                .from('location_training_courses')
                .upsert([
                  {
                    location_id: selectedLocation,
                    training_course_id: course.id,
                    display_order: idx + 1,
                  },
                ], { onConflict: 'location_id,training_course_id' });
            }
            // After import, re-fetch matrix data to show DB-backed courses
            fetchMatrixData();
          } catch (e) {
            console.warn('Could not import CSV headers for location', locationObj.name, e);
          }
        }
      }
    })();
  }, [selectedLocation, locations]);

  const checkAuth = async (): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      setUserRole('admin');
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };

  const checkTheme = (): void => {
    if (typeof window !== 'undefined') {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    }
  };

  const fetchLocations = async (): Promise<void> => {
    try {
      if (!hasPermission(userRole, 'ADMIN_DASHBOARD', 'canView')) {
        const { data, error } = await supabase
          .from('staff_locations')
          .select('location_id, locations(id, name)')
          .eq('staff_id', user.id);

        if (error) {
          console.warn('Error fetching staff locations:', error);
          return;
        }

        if (data && data.length > 0 && data[0].locations) {
          setLocations([data[0].locations]);
          setSelectedLocation((data[0].locations as any).id);
        }
        return;
      }

      const { data, error } = await supabase.from('locations').select('id, name').order('name');
      if (error) {
        console.error('Error fetching locations:', error);
        return;
      }

      if (data && data.length > 0) {
        // Deduplicate locations by id to prevent duplicates in dropdown
        const uniqueLocations = Array.from(new Map(data.map(loc => [loc.id, loc])).values());
        setLocations(uniqueLocations);
        setSelectedLocation(uniqueLocations[0].id);
      }
    } catch (error) {
      console.error('Error in fetchLocations:', error);
    }
  }

  async function fetchMatrixData() {
    try {
      setLoading(true);

      // Fetch dividers from location_matrix_dividers table
      const { data: dividersData, error: dividersError } = await supabase
        .from('location_matrix_dividers')
        .select('id, name, display_order')
        .eq('location_id', selectedLocation)
        .order('display_order', { ascending: true });

      if (dividersError) {
        console.warn('Error fetching dividers:', dividersError);
      }

      // First, fetch all staff from staff_locations with display_order
      const { data: staffLocationsData, error: staffLocationsError } = await supabase
        .from('staff_locations')
        .select('staff_id, display_order, profiles(id, full_name, is_deleted)')
        .eq('location_id', selectedLocation)
        .order('display_order', { ascending: true, nullsFirst: false });

      if (staffLocationsError) {
        console.warn('Error fetching staff from staff_locations:', staffLocationsError);
      }
      
      // Filter out deleted profiles in code
      const activeStaffLocationsData = staffLocationsData?.filter((sl: any) => !sl.profiles?.is_deleted) || [];

      // Also fetch staff who have training records for this location (even if not in staff_locations)
      // Get distinct staff IDs first, then fetch their profiles - WITH PAGINATION
      let allTrainingStaffIds: any[] = [];
      let pageNum = 0;
      const staffPageSize = 1000;
      let hasMoreStaff = true;
      
      while (hasMoreStaff) {
        const { data: trainingStaffIds, error: trainingStaffIdError } = await supabase
          .from('staff_training_matrix')
          .select('staff_id')
          .eq('completed_at_location_id', selectedLocation)
          .range(pageNum * staffPageSize, (pageNum + 1) * staffPageSize - 1);

        if (trainingStaffIdError) {
          console.warn('Error fetching training staff IDs page', pageNum, ':', trainingStaffIdError);
          break;
        }

        if (!trainingStaffIds || trainingStaffIds.length === 0) {
          hasMoreStaff = false;
        } else {
          console.log(`Fetching staff page ${pageNum}: ${trainingStaffIds.length} records`);
          allTrainingStaffIds = allTrainingStaffIds.concat(trainingStaffIds);
          pageNum++;
          if (trainingStaffIds.length < staffPageSize) {
            hasMoreStaff = false;
          }
        }
      }
      
      console.log(`Total staff from training data (paginated): ${allTrainingStaffIds.length}`);

      // Get unique staff IDs from training data
      const uniqueStaffIds = new Set<string>();
      allTrainingStaffIds?.forEach((t: any) => {
        if (t.staff_id) {
          uniqueStaffIds.add(t.staff_id);
        }
      });

      // Fetch profiles for these staff members
      let trainingStaffData: any[] = [];
      if (uniqueStaffIds.size > 0) {
        const staffIdArray = Array.from(uniqueStaffIds);
        console.log('Fetching profiles for staff IDs:', staffIdArray.length);
        
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', staffIdArray)
          .eq('is_deleted', false);

        if (profileError) {
          console.error('Error fetching profiles:', profileError);
        } else {
          console.log('Fetched profiles:', profiles?.length || 0);
          trainingStaffData = profiles?.map((p: any) => ({
            profiles: p
          })) || [];
        }
      } else {
        console.log('No training staff IDs found for this location');
      }

      // Merge both lists, eliminating duplicates
      const staffMap = new Map<string, any>();
      
      console.log('Staff from staff_locations:', activeStaffLocationsData?.length || 0);
      activeStaffLocationsData?.forEach((s: any) => {
        if (s.profiles) {
          staffMap.set(s.profiles.id, {
            id: s.profiles.id,
            full_name: s.profiles.full_name,
            source: 'staff_locations'
          });
        }
      });

      console.log('Staff from training data:', trainingStaffData?.length || 0);
      trainingStaffData?.forEach((s: any) => {
        console.log('Processing training staff:', s);
        if (s.profiles && !staffMap.has(s.profiles.id)) {
          staffMap.set(s.profiles.id, {
            id: s.profiles.id,
            full_name: s.profiles.full_name,
            source: 'training_data'
          });
        }
      });

      console.log('Final staff map size:', staffMap.size);

      const staffData = Array.from(staffMap.values()).map(s => ({
        profiles: { id: s.id, full_name: s.full_name }
      }));

      // Fetch courses with LOCATION-SPECIFIC ordering from location_training_courses table.
      // Some DB environments don't have `training_courses.category`, so fallback to a schema without it.
      let locationCoursesData: any[] | null = null;
      let locationCoursesError: any = null;

      const withCategoryRes = await supabase
        .from('location_training_courses')
        .select(`
          training_course_id,
          display_order,
          training_courses(id, name, category, expiry_months, never_expires)
        `)
        .eq('location_id', selectedLocation)
        .order('display_order', { ascending: true, nullsFirst: false });

      locationCoursesData = withCategoryRes.data;
      locationCoursesError = withCategoryRes.error;

      if (locationCoursesError?.code === '42703') {
        const withoutCategoryRes = await supabase
          .from('location_training_courses')
          .select(`
            training_course_id,
            display_order,
            training_courses(id, name, expiry_months, never_expires)
          `)
          .eq('location_id', selectedLocation)
          .order('display_order', { ascending: true, nullsFirst: false });

        locationCoursesData = withoutCategoryRes.data;
        locationCoursesError = withoutCategoryRes.error;
      }

      console.log('DEBUG: selectedLocation =', selectedLocation);
      console.log('DEBUG: locationCoursesError =', locationCoursesError);
      console.log('DEBUG: locationCoursesData =', locationCoursesData);
      console.log('DEBUG: locationCoursesData length =', locationCoursesData?.length);

      if (locationCoursesError) {
        console.warn('Error fetching location courses:', locationCoursesError);
      }

      // Map courses with location-specific ordering
      let filteredCourses = (locationCoursesData || [])
        .map((lc: any) => {
          const joinedCourse = Array.isArray(lc.training_courses) ? lc.training_courses[0] : lc.training_courses;
          if (!joinedCourse) return null;

          return {
            id: joinedCourse.id,
            name: joinedCourse.name,
            category: joinedCourse.category || undefined,
            display_order: lc.display_order,
            expiry_months: joinedCourse.expiry_months !== null ? joinedCourse.expiry_months : null,
            never_expires: joinedCourse.never_expires || false,
          };
        })
        .filter(Boolean) as Course[];

      // Pull category/header labels from CSV top row for this location.
      // DB schema currently doesn't hold per-location training course category headers.
      const selectedLocationObj = locations.find(l => l.id === selectedLocation);
      if (selectedLocationObj?.name) {
        try {
          const csvUrl = getCsvUrlForLocation(selectedLocationObj.name);
          const res = await fetch(csvUrl);
          if (res.ok) {
            const csvContent = await res.text();
            const csvHeaders: CsvHeaderRows = parseFirstThreeRowsFromCsvString(csvContent);
            const csvCategoryByCourseName = new Map<string, string>();

            for (let idx = 1; idx < csvHeaders.courseNameRow.length; idx++) {
              const courseName = csvHeaders.courseNameRow[idx]?.trim();
              if (!courseName) continue;
              const category = csvHeaders.categoryRow[idx]?.trim() || '';
              if (category) {
                csvCategoryByCourseName.set(normalizeCourseName(courseName), category);
              }
            }

            filteredCourses = filteredCourses.map(course => ({
              ...course,
              category: course.category || csvCategoryByCourseName.get(normalizeCourseName(course.name)) || undefined,
            }));
          }
        } catch (error) {
          console.warn('Could not load CSV category headers:', error);
        }
      }

      // Apply manual per-location overrides after CSV defaults.
      const categoryOverrides = getCategoryOverrides(selectedLocation);
      filteredCourses = filteredCourses.map(course => ({
        ...course,
        category: categoryOverrides[course.id] ?? course.category,
      }));

      console.log(`Found ${filteredCourses.length} courses for location ${selectedLocation} with location-specific ordering`);

      // Build mapping of Careskills course IDs to base course IDs
      // This allows records stored under "(Careskills)" variants to show in the base course column
      const { data: allCoursesForMapping } = await supabase
        .from('training_courses')
        .select('id, name');
      
      const careskillsToBaseMap = new Map<string, string>();
      if (allCoursesForMapping) {
        const baseCourses = new Map<string, string>();
        
        // First, index all base courses (without Careskills suffix)
        allCoursesForMapping.forEach((c: any) => {
          if (!c.name.includes('(Careskills)')) {
            baseCourses.set(c.name.toLowerCase().trim(), c.id);
          }
        });
        
        // Then, map Careskills courses to their base equivalents
        allCoursesForMapping.forEach((c: any) => {
          if (c.name.includes('(Careskills)')) {
            const baseName = c.name.replace(' (Careskills)', '').toLowerCase().trim();
            const baseId = baseCourses.get(baseName);
            if (baseId) {
              careskillsToBaseMap.set(c.id, baseId);
            }
          }
        });
        console.log(`Mapped ${careskillsToBaseMap.size} Careskills courses to base courses`);
      }
      
      // Fetch all training records by paginating through results
      let allTrainingData: any[] = [];
      let pageNumber = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data: pageData, error: pageError } = await supabase
          .from('staff_training_matrix')
          .select(`
            id,
            staff_id,
            course_id,
            completion_date,
            expiry_date,
            status,
            completed_at_location_id
          `)
          .eq('completed_at_location_id', selectedLocation)
          .order('id', { ascending: true })
          .range(pageNumber * pageSize, (pageNumber + 1) * pageSize - 1);
        
        if (pageError) {
          console.warn('Error fetching training data page', pageNumber, ':', pageError);
          break;
        }
        
        if (!pageData || pageData.length === 0) {
          hasMore = false;
        } else {
          console.log(`Fetching training data page ${pageNumber}: ${pageData.length} records`);
          allTrainingData = allTrainingData.concat(pageData);
          pageNumber++;
          if (pageData.length < pageSize) {
            hasMore = false;
          }
        }
      }
      
      const trainingData = allTrainingData;
      const trainingError = null;
      console.log('Total training records fetched (paginated):', trainingData.length);
      console.log('Selected location:', selectedLocation);

      if (trainingError) {
        console.warn('Error fetching training data:', trainingError);
      }

      // Collect all unique staff IDs from training data for this location
      const staffFromTrainingSet = new Set<string>();
      trainingData?.forEach((t: any) => {
        if (t.completed_at_location_id === selectedLocation) {
          staffFromTrainingSet.add(t.staff_id);
        }
      });

      console.log('Staff IDs in training data:', Array.from(staffFromTrainingSet).length);

      // Combine staff from staffData with staff IDs from training data
      const allStaffIds = new Set<string>();
      staffData?.forEach((s: any) => {
        if (s.profiles) {
          allStaffIds.add(s.profiles.id);
        }
      });
      staffFromTrainingSet.forEach(id => allStaffIds.add(id));
      console.log('Total unique staff:', allStaffIds.size);

      // Get profiles for any staff IDs that aren't in staffData
      let allStaffProfiles: any[] = [];
      if (staffData && staffData.length > 0) {
        allStaffProfiles = staffData.filter((s: any) => s.profiles);
      }

      // Add any missing profiles from training data
      const staffIdsInProfiles = new Set(allStaffProfiles.map((s: any) => s.profiles.id));
      const missingIds = Array.from(allStaffIds).filter(id => !staffIdsInProfiles.has(id));

      if (missingIds.length > 0) {
        console.log('Fetching missing staff profiles:', missingIds.length);
        const { data: missingProfiles, error: missingError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', missingIds)
          .eq('is_deleted', false);

        if (missingError) {
          console.error('Error fetching missing profiles:', missingError);
        } else if (missingProfiles) {
          missingProfiles.forEach((p: any) => {
            allStaffProfiles.push({ profiles: p });
          });
        }
      }

      // Build staff list with display_order from staff_locations
      const staffWithOrder = allStaffProfiles
        .filter((s: any) => s.profiles && !s.profiles.full_name?.toLowerCase().includes('deleted'))
        .map((s: any) => {
          // Find display_order from staffLocationsData
          const staffLoc = activeStaffLocationsData?.find((sl: any) => sl.staff_id === s.profiles.id);
          return {
            id: s.profiles.id,
            name: s.profiles.full_name,
            location_id: selectedLocation,
            display_order: staffLoc?.display_order || 9999,
            isDivider: false,
          };
        });

      // Add dividers from the database
      const dividerItems = (dividersData || [])
        .filter((d: any) => d.name !== 'Staff Name') // Filter out "Staff Name" header
        .map((d: any) => ({
          id: `divider-${d.id}`,
          name: d.name,
          location_id: selectedLocation,
          display_order: d.display_order,
          isDivider: true,
        }));

      // Merge staff and dividers, sort by display_order
      const combinedList = [...staffWithOrder, ...dividerItems]
        .sort((a, b) => (a.display_order || 9999) - (b.display_order || 9999));

      console.log('Formatted staff for location:', { staffCount: staffWithOrder.length, dividerCount: dividerItems.length });

      // Set divider IDs for styling
      const dividerIds = new Set<string>(dividerItems.map((d: any) => d.id));
      setStaffDividers(dividerIds);
      setStaff(combinedList);

      console.log('DEBUG: filteredCourses =', filteredCourses);
      console.log('DEBUG: filteredCourses length =', filteredCourses?.length);
      if (filteredCourses && filteredCourses.length > 0) {
        setCourses(filteredCourses);
        console.log('DEBUG: Courses set to state:', filteredCourses);
      } else {
        console.warn('DEBUG: No courses found!');
      }

      // Build matrix as plain object from the start
      const plainMatrix: Record<string, Record<string, MatrixCell>> = {};

      // Initialize matrix with all staff IDs
      allStaffProfiles?.forEach((s: any) => {
        if (s.profiles) {
          plainMatrix[s.profiles.id] = {};
        }
      });

      console.log('Matrix initialized with', Object.keys(plainMatrix).length, 'staff');

      // Add training data
      let addedCount = 0;
      let mappedCount = 0;
      trainingData?.forEach((t: any) => {
        // Filter by location on client side
        if (t.completed_at_location_id === selectedLocation) {
          if (plainMatrix[t.staff_id]) {
            addedCount++;
            
            // Check if this is a Careskills course that should be mapped to a base course
            const effectiveCourseId = careskillsToBaseMap.get(t.course_id) || t.course_id;
            if (effectiveCourseId !== t.course_id) {
              mappedCount++;
            }
            
            // Only add if we don't already have data for this cell, or if existing data is empty
            const existingCell = plainMatrix[t.staff_id][effectiveCourseId];
            if (!existingCell || (!existingCell.completion_date && t.completion_date)) {
              plainMatrix[t.staff_id][effectiveCourseId] = {
                completion_date: t.completion_date,
                expiry_date: t.expiry_date,
                training_id: t.id,
                status: t.status,
              };
            }
          }
        }
      });
      console.log(`Added ${addedCount} training records to matrix (${mappedCount} mapped from Careskills variants)`);

      console.log('Final matrix data:', Object.keys(plainMatrix).length, 'staff with data');
      // Count total cells
      let totalCells = 0;
      Object.values(plainMatrix).forEach(staffMap => {
        totalCells += Object.keys(staffMap).length;
      });
      console.log('Total cells with training data:', totalCells);

      setMatrixData(plainMatrix);
    } catch (error) {
      console.error('Error fetching matrix data:', error);
    } finally {
      setLoading(false);
      // Reset horizontal scroll to show first courses after data is loaded
      setTimeout(() => {
        if (tableScrollContainerRef.current) {
          tableScrollContainerRef.current.scrollLeft = 0;
        }
      }, 50);
    }
  }

  async function saveCourseChanges(courseId: string, updates: Partial<Course>, skipRefresh = false) {
    try {
      console.log('Saving course changes:', { courseId, updates });

      const response = await fetch('/api/update-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, updates }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('API error:', result.error);
        throw new Error(`${result.error} (${result.code || 'UNKNOWN'})`);
      }

      console.log('Course update successful:', result.data);
      
      // Only refresh if it's not a header-only change
      if (!skipRefresh) {
        await fetchMatrixData();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Error saving course changes:', errorMsg);
      alert(`Error saving course changes: ${errorMsg}`);
    }
  }

  function getDateStatus(expiryDate: string) {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const twoMonthsFromNow = new Date();
    twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);

    if (expiry < today) return 'expired';
    if (expiry < twoMonthsFromNow) return 'expiring';
    return 'valid';
  }

  function getDateColor(status: string) {
    switch (status) {
      case 'valid':
      case 'no-expiry':
        return isDark ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-900';
      case 'expiring':
        return isDark ? 'bg-amber-900 text-amber-100' : 'bg-amber-100 text-amber-900';
      case 'expired':
        return isDark ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-900';
      default:
        return isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700';
    }
  }

  function getStatusDisplay(status: string | null) {
    switch (status) {
      case 'booked':
        return { label: 'Booked', color: isDark ? 'bg-blue-900 text-blue-100' : 'bg-blue-100 text-blue-900' };
      case 'awaiting':
        return { label: 'Awaiting Date', color: isDark ? 'bg-yellow-900 text-yellow-100' : 'bg-yellow-100 text-yellow-900' };
      case 'na':
        return { label: 'N/A', color: isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-900' };
      default:
        return { label: null, color: '' };
    }
  }

  const canEditMatrix = userRole === 'admin' || userRole === 'scheduler';

  const moveCourse = (courseId: string, direction: 'left' | 'right') => {
    const currentIndex = courses.findIndex(c => c.id === courseId);
    if (currentIndex === -1) return;

    const newCourses = [...courses];
    if (direction === 'left' && currentIndex > 0) {
      [newCourses[currentIndex], newCourses[currentIndex - 1]] = [newCourses[currentIndex - 1], newCourses[currentIndex]];
    } else if (direction === 'right' && currentIndex < newCourses.length - 1) {
      [newCourses[currentIndex], newCourses[currentIndex + 1]] = [newCourses[currentIndex + 1], newCourses[currentIndex]];
    }

    setCourses(newCourses);
  };

  const handleCourseDropStart = (e: React.DragEvent, courseId: string) => {
    setDraggedCourse(courseId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCourseDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleCourseDropEnd = (e: React.DragEvent, targetCourseId: string) => {
    e.preventDefault();
    if (!draggedCourse || draggedCourse === targetCourseId) {
      setDraggedCourse(null);
      return;
    }

    const draggedIndex = courses.findIndex(c => c.id === draggedCourse);
    const targetIndex = courses.findIndex(c => c.id === targetCourseId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedCourse(null);
      return;
    }

    const newCourses = [...courses];
    const [draggedItem] = newCourses.splice(draggedIndex, 1);
    newCourses.splice(targetIndex, 0, draggedItem);

    setCourses(newCourses);
    setDraggedCourse(null);
  };

  const handleStaffDropStart = (e: React.DragEvent, staffId: string) => {
    setDraggedStaff(staffId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleStaffDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleStaffDropEnd = (e: React.DragEvent, targetStaffId: string) => {
    e.preventDefault();
    if (!draggedStaff || draggedStaff === targetStaffId) {
      setDraggedStaff(null);
      return;
    }

    const draggedIndex = staff.findIndex(s => s.id === draggedStaff);
    const targetIndex = staff.findIndex(s => s.id === targetStaffId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedStaff(null);
      return;
    }

    const newStaff = [...staff];
    const [draggedItem] = newStaff.splice(draggedIndex, 1);
    newStaff.splice(targetIndex, 0, draggedItem);

    setStaff(newStaff);
    setDraggedStaff(null);
  };

  const addNewCourse = async () => {
    if (!newCourseName.trim()) return;

    if (!selectedLocation || selectedLocation.trim() === '') {
      alert('Please select a location before adding a course');
      return;
    }

    try {
      const { data: newCourse, error } = await supabase
        .from('courses')
        .insert([
          {
            name: newCourseName.trim(),
            expiry_months: 12,
            display_order: courses.length + 1,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Add the course to location_courses for the current location
      if (selectedLocation) {
        const { error: locError } = await supabase
          .from('location_courses')
          .insert([
            {
              location_id: selectedLocation,
              course_id: newCourse.id,
            },
          ]);

        if (locError) {
          console.error('Error adding course to location:', locError);
          // Still add to UI even if location assignment fails
        }
      }

      setCourses([...courses, newCourse]);
      setNewCourseName('');
      setShowAddCourse(false);
    } catch (error) {
      console.error('Error adding course:', error);
      alert('Error adding course');
    }
  };

  const deleteCourse = (courseId: string) => {
    if (confirm('Are you sure you want to delete this course? This will remove it from all training records.')) {
      setCourses(courses.filter(c => c.id !== courseId));
      // Note: In production, you would also delete from the database
      // await supabase.from('courses').delete().eq('id', courseId);
    }
  };

  const reorderCourses = async () => {
    // Parse the input - can be comma-separated or newline-separated course names
    const courseNames = courseOrderInput
      .split(/[,\n]/)
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (courseNames.length === 0) {
      alert('Please enter course names');
      return;
    }

    // Match input names to actual courses
    const reorderedCourses: Course[] = [];
    const unmatchedNames: string[] = [];

    for (const inputName of courseNames) {
      const foundCourse = courses.find(
        c => c.name.toLowerCase() === inputName.toLowerCase()
      );
      if (foundCourse) {
        reorderedCourses.push(foundCourse);
      } else {
        unmatchedNames.push(inputName);
      }
    }

    if (unmatchedNames.length > 0) {
      alert(`Could not find these courses: ${unmatchedNames.join(', ')}`);
      return;
    }

    // Update display_order for all courses
    for (let i = 0; i < reorderedCourses.length; i++) {
      const course = reorderedCourses[i];
      try {
        await supabase.rpc('update_course_data', {
          p_course_id: course.id,
          p_updates: JSON.stringify({ display_order: i + 1 }),
        });
      } catch (error) {
        console.error('Error updating course order:', error);
      }
    }

    // Update state
    setCourses(reorderedCourses);
    setShowReorderCourses(false);
    setCourseOrderInput('');
    alert('Courses reordered successfully!');
  };

  const addNewDivider = () => {
    if (!newDividerName.trim()) return;

    // Create a temporary ID for the divider
    const dividerId = `divider-${Date.now()}`;
    
    // Add divider to staff list
    const newDivider: Staff = {
      id: dividerId,
      name: newDividerName.trim(),
      location_id: selectedLocation,
    };

    // Insert after current position or at end
    setStaff([...staff, newDivider]);
    setStaffDividers(new Set([...staffDividers, dividerId]));
    setNewDividerName('');
    setShowAddDivider(false);
  };

  const moveStaff = (staffId: string, direction: 'up' | 'down') => {
    const currentIndex = staff.findIndex(s => s.id === staffId);
    if (currentIndex === -1) return;

    const newStaff = [...staff];
    if (direction === 'up' && currentIndex > 0) {
      [newStaff[currentIndex], newStaff[currentIndex - 1]] = [newStaff[currentIndex - 1], newStaff[currentIndex]];
    } else if (direction === 'down' && currentIndex < newStaff.length - 1) {
      [newStaff[currentIndex], newStaff[currentIndex + 1]] = [newStaff[currentIndex + 1], newStaff[currentIndex]];
    }

    setStaff(newStaff);

    // Save new order to database
    const newOrder = new Map<string, number>();
    newStaff.forEach((s, idx) => {
      newOrder.set(s.id, idx);
    });
    setStaffOrder(newOrder);

    // Optionally persist to database (for now just in UI)
  };

  const deleteStaffMember = async (staffId: string) => {
    const staffMember = staff.find(s => s.id === staffId);
    if (!staffMember) return;

    if (!confirm(`Delete "${staffMember.name}"? This will remove them from the training matrix.`)) return;

    try {
      // Remove from UI first
      setStaff(staff.filter(s => s.id !== staffId));
      staffDividers.delete(staffId);
      setStaffDividers(new Set(staffDividers));

      // If it's a real staff member (not a temporary divider), try to delete from database
      if (!staffId.startsWith('divider-')) {
        const response = await fetch('/api/delete-staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staffId, email: `deleted-${staffId}@system.local` })
        });

        if (!response.ok) {
          console.warn('Could not delete from database, but removed from UI');
        }
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('❌ Error deleting staff member');
      // Re-fetch to restore the staff member
      fetchMatrixData();
    }
  };

  if (loading || !user) {
    return <div className={`p-8 ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>Loading...</div>;
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex justify-between items-center mb-4">
          <HomeButton />
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Training Matrix</h1>
          <div className="w-10" />
        </div>

        {/* Centered Controls */}
        {locations.length > 0 && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <label className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Select Site:</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className={`px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200`}
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Buttons Row - Centered */}
            {selectedLocation && (
              <div className="flex flex-wrap justify-center gap-2">
                {canEditMatrix && (
                  <>
                    {!showAddCourse ? (
                      <button
                        onClick={() => setShowAddCourse(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm font-medium"
                      >
                        + Course
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCourseName}
                          onChange={(e) => setNewCourseName(e.target.value)}
                          placeholder="Course name"
                          className={`px-3 py-2 rounded border text-sm transition-colors duration-150 ${
                            isDark
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') addNewCourse();
                            if (e.key === 'Escape') {
                              setShowAddCourse(false);
                              setNewCourseName('');
                            }
                          }}
                          autoFocus
                        />
                        <button
                          onClick={addNewCourse}
                          className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => {
                            setShowAddCourse(false);
                            setNewCourseName('');
                          }}
                          className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    {!showAddDivider ? (
                      <button
                        onClick={() => setShowAddDivider(true)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 text-sm font-medium"
                      >
                        + Divider
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newDividerName}
                          onChange={(e) => setNewDividerName(e.target.value)}
                          placeholder="Section name (e.g., Management)"
                          className={`px-3 py-2 rounded border text-sm transition-colors duration-150 ${
                            isDark
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') addNewDivider();
                            if (e.key === 'Escape') {
                              setShowAddDivider(false);
                              setNewDividerName('');
                            }
                          }}
                          autoFocus
                        />
                        <button
                          onClick={addNewDivider}
                          className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => {
                            setShowAddDivider(false);
                            setNewDividerName('');
                          }}
                          className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-8">
        {staff.length === 0 ? (
          <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            No data available for this location
          </div>
        ) : courses.length === 0 ? (
          <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            No courses configured for this location yet.
          </div>
        ) : (
          <div className={`rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} overflow-hidden shadow-lg`}>
            <div ref={tableScrollContainerRef} className="overflow-x-auto overflow-y-auto h-[calc(100vh-280px)]">
              <table className={`w-full text-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <thead className="sticky top-0 z-20">
                  {/* Category Row */}
                  <tr style={{ position: 'sticky', top: '0px', zIndex: 20 }} className={`h-8 ${isDark ? 'bg-gray-600' : 'bg-gray-200'} border-b ${isDark ? 'border-gray-500' : 'border-gray-300'}`}>
                    <th className={`px-4 py-1 text-left font-semibold text-xs sticky left-0 z-30 ${isDark ? 'bg-gray-600' : 'bg-gray-200'} min-w-[200px]`}>
                    </th>
                    {courses.map((course) => (
                      <th
                        key={`cat-${course.id}`}
                        onClick={() => {
                          setEditingHeader({ courseId: course.id, type: 'category' });
                          setEditHeaderValue(course.category || '');
                        }}
                        className={`px-2 py-1 text-center text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'} min-w-[140px] cursor-pointer hover:opacity-80 ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}
                      >
                        {editingHeader?.courseId === course.id && editingHeader?.type === 'category' ? (
                          <input
                            type="text"
                            value={editHeaderValue}
                            onChange={(e) => setEditHeaderValue(e.target.value)}
                            onBlur={() => {
                              const newCategory = editHeaderValue.trim() || undefined;
                              // Update local state immediately for instant feedback
                              const updatedCourses = courses.map(c => c.id === course.id ? { ...c, category: newCategory } : c);
                              setCourses(updatedCourses);
                              // Persist category header override per location.
                              saveCategoryOverride(selectedLocation, course.id, newCategory || '');
                              setEditingHeader(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const newCategory = editHeaderValue.trim() || undefined;
                                // Update local state immediately for instant feedback
                                const updatedCourses = courses.map(c => c.id === course.id ? { ...c, category: newCategory } : c);
                                setCourses(updatedCourses);
                                // Persist category header override per location.
                                saveCategoryOverride(selectedLocation, course.id, newCategory || '');
                                setEditingHeader(null);
                              }
                              if (e.key === 'Escape') setEditingHeader(null);
                            }}
                            className={`w-full text-xs px-1 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-400 text-gray-900'}`}
                            autoFocus
                          />
                        ) : (
                          course.category || '—'
                        )}
                      </th>
                    ))}
                  </tr>
                  {/* Course Name Row */}
                  <tr style={{ position: 'sticky', top: '32px', zIndex: 20 }} className={`h-8 ${isDark ? 'bg-gray-600' : 'bg-gray-200'} border-b ${isDark ? 'border-gray-500' : 'border-gray-300'}`}>
                    <th className={`px-4 py-1 text-left font-semibold text-xs sticky left-0 z-30 ${isDark ? 'bg-gray-600' : 'bg-gray-200'} min-w-[200px]`}>
                      Staff Member
                    </th>
                    {courses.map((course) => (
                      <th
                        key={`name-${course.id}`}
                        draggable={!editingHeader}
                        onDragStart={(e) => handleCourseDropStart(e, course.id)}
                        onDragOver={handleCourseDragOver}
                        onDrop={(e) => handleCourseDropEnd(e, course.id)}
                        onClick={() => {
                          setEditingHeader({ courseId: course.id, type: 'name' });
                          setEditHeaderValue(course.name);
                        }}
                        className={`px-2 py-1 text-center text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} min-w-[140px] transition-all duration-150 cursor-grab active:cursor-grabbing hover:opacity-80 ${isDark ? 'bg-gray-600' : 'bg-gray-200'} ${
                          draggedCourse === course.id ? 'opacity-50' : 'opacity-100'
                        } ${draggedCourse && draggedCourse !== course.id ? 'bg-gray-500 bg-opacity-30' : ''}`}
                        title="Drag to reorder courses"
                      >
                        {editingHeader?.courseId === course.id && editingHeader?.type === 'name' ? (
                          <input
                            type="text"
                            value={editHeaderValue}
                            onChange={(e) => setEditHeaderValue(e.target.value)}
                            onBlur={() => {
                              if (editHeaderValue.trim()) {
                                const updatedCourses = courses.map(c => c.id === course.id ? { ...c, name: editHeaderValue.trim() } : c);
                                setCourses(updatedCourses);
                                saveCourseChanges(course.id, { name: editHeaderValue.trim() }, true);
                              }
                              setEditingHeader(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (editHeaderValue.trim()) {
                                  const updatedCourses = courses.map(c => c.id === course.id ? { ...c, name: editHeaderValue.trim() } : c);
                                  setCourses(updatedCourses);
                                  saveCourseChanges(course.id, { name: editHeaderValue.trim() }, true);
                                }
                                setEditingHeader(null);
                              }
                              if (e.key === 'Escape') setEditingHeader(null);
                            }}
                            className={`w-full text-xs px-1 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-400 text-gray-900'}`}
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-gray-500">⋮⋮</span>
                            <span className="block max-w-[110px] truncate text-xs leading-tight" title={course.name}>{course.name}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCourse(course.id);
                              }}
                              className={`ml-1 text-red-600 hover:text-red-700 font-bold text-sm leading-none opacity-60 hover:opacity-100 transition-opacity`}
                              title="Delete course"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                  {/* Expiry Time Row */}
                  <tr style={{ position: 'sticky', top: '64px', zIndex: 20 }} className={`h-8 ${isDark ? 'bg-gray-600' : 'bg-gray-200'} border-b ${isDark ? 'border-gray-500' : 'border-gray-300'}`}>
                    <th className={`px-4 py-1 text-left font-semibold text-xs sticky left-0 z-30 ${isDark ? 'bg-gray-600' : 'bg-gray-200'} min-w-[200px]`}>
                    </th>
                    {courses.map((course) => (
                      <th
                        key={`expiry-${course.id}`}
                        onClick={() => {
                          setEditingHeader({ courseId: course.id, type: 'expiry' });
                          setEditHeaderValue(String(course.expiry_months || 12));
                        }}
                        className={`px-2 py-1 text-center text-xs cursor-pointer hover:opacity-80 ${isDark ? 'text-gray-400' : 'text-gray-600'} min-w-[140px] ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}
                      >
                        {editingHeader?.courseId === course.id && editingHeader?.type === 'expiry' ? (
                          <div className="flex flex-col gap-2">
                            <label className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                              <input
                                type="checkbox"
                                checked={course.never_expires || false}
                                onChange={(e) => {
                                  const updatedCourses = courses.map(c => c.id === course.id ? { ...c, never_expires: e.target.checked } : c);
                                  setCourses(updatedCourses);
                                }}
                                className="mr-1"
                              />
                              Never expires
                            </label>
                            {!course.never_expires && (
                              <input
                                type="number"
                                value={editHeaderValue}
                                onChange={(e) => setEditHeaderValue(e.target.value)}
                                onBlur={async () => {
                                  const months = parseInt(editHeaderValue) || 12;
                                  const updatedCourses = courses.map(c => c.id === course.id ? { ...c, expiry_months: months } : c);
                                  setCourses(updatedCourses);
                                  await saveCourseChanges(course.id, { expiry_months: months, never_expires: false });
                                  await updateAllExpiriesForCourse(course.id, months, false);
                                  setEditingHeader(null);
                                }}
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    const months = parseInt(editHeaderValue) || 12;
                                    const updatedCourses = courses.map(c => c.id === course.id ? { ...c, expiry_months: months } : c);
                                    setCourses(updatedCourses);
                                    await saveCourseChanges(course.id, { expiry_months: months, never_expires: false });
                                    await updateAllExpiriesForCourse(course.id, months, false);
                                    setEditingHeader(null);
                                  }
                                  if (e.key === 'Escape') setEditingHeader(null);
                                }}
                                className={`w-full text-xs px-1 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-400 text-gray-900'}`}
                                placeholder="months"
                                autoFocus
                              />
                            )}
                            {(course.never_expires || course.expiry_months === 9999) && (
                              <button
                                onClick={async () => {
                                  const updatedCourses = courses.map(c => c.id === course.id ? { ...c, never_expires: false, expiry_months: 12 } : c);
                                  setCourses(updatedCourses);
                                  await saveCourseChanges(course.id, { never_expires: false, expiry_months: 12 });
                                  setEditingHeader(null);
                                }}
                                className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-300 hover:bg-gray-400'} transition-colors`}
                              >
                                Change to months
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                await saveCourseChanges(course.id, { expiry_months: parseInt(editHeaderValue) || 12, never_expires: course.never_expires || false });
                                await updateAllExpiriesForCourse(course.id, parseInt(editHeaderValue) || 12, course.never_expires || false);
                                setEditingHeader(null);
                              }}
                              className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          formatExpiryDisplay(course.expiry_months, course.never_expires)
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staff.map((staffMember) => {
                    const isDivider = staffDividers.has(staffMember.id);

                    return (
                      <tr
                        key={staffMember.id}
                        draggable={true}
                        onDragStart={(e) => handleStaffDropStart(e, staffMember.id)}
                        onDragOver={handleStaffDragOver}
                        onDrop={(e) => handleStaffDropEnd(e, staffMember.id)}
                        className={`border-b transition-all duration-150 ${
                          isDivider
                            ? `${isDark ? 'bg-gray-900' : 'bg-gray-300'}`
                            : `${isDark ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-200 hover:bg-gray-50'} ${draggedStaff === staffMember.id ? 'opacity-50' : 'opacity-100'} ${draggedStaff && draggedStaff !== staffMember.id ? 'cursor-move' : ''}`
                        }`}
                      >
                        <td
                          className={`px-4 py-2 font-medium sticky left-0 min-w-[200px] z-10 text-sm group ${
                            isDivider
                              ? `${isDark ? 'bg-gray-900 text-gray-400' : 'bg-gray-300 text-gray-600'} font-semibold`
                              : `${isDark ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-900'}`
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm flex-1">{staffMember.name}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteStaffMember(staffMember.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-500/20 rounded p-1 text-base leading-none flex-shrink-0"
                              title={`Delete ${staffMember.name}`}
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                        {courses.map((course) => {
                          if (isDivider) {
                            return (
                              <td
                                key={`${staffMember.id}-${course.id}`}
                                className={`px-4 py-3 ${isDark ? 'bg-gray-900' : 'bg-gray-300'}`}
                              />
                            );
                          }

                          const cell = matrixData[staffMember.id]?.[course.id];
                          const isEditing = editingCell?.staffId === staffMember.id && editingCell?.courseId === course.id;
                          const isOneOff = course.never_expires || course.expiry_months === 9999 || course.expiry_months === null;
                          const dateStatus = isOneOff ? 'no-expiry' : (cell?.expiry_date ? getDateStatus(cell.expiry_date) : 'no-expiry');
                          const dateColor = getDateColor(dateStatus);
                          const statusDisplay = getStatusDisplay(cell?.status);

                          return (
                            <td
                              key={`${staffMember.id}-${course.id}`}
                              className={`px-4 py-3 text-center transition-all duration-200 ${
                                canEditMatrix ? 'cursor-pointer hover:opacity-75' : ''
                              }`}
                              onClick={() => {
                                if (canEditMatrix && !isEditing) {
                                  setEditingCell({ staffId: staffMember.id, courseId: course.id });
                                  setEditDate(cell?.completion_date || '');
                                  setEditStatus(cell?.status as any || 'completed');
                                }
                              }}
                            >
                              {isEditing ? (
                                <span className={`p-2 rounded ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'} text-blue-600 text-xs font-medium`}>
                                  Editing...
                                </span>
                              ) : cell?.status === 'booked' ? (
                                <div className={`p-2 rounded ${statusDisplay.color}`}>
                                  <div className="font-semibold text-sm">Booked</div>
                                  {cell?.expiry_date && (
                                    <div className="text-xs mt-1">
                                      Exp: {new Date(cell.expiry_date).toLocaleDateString('en-GB')}
                                    </div>
                                  )}
                                </div>
                              ) : cell?.status === 'awaiting' ? (
                                <div className={`p-2 rounded ${statusDisplay.color}`}>
                                  <div className="font-semibold text-sm">Awaiting Date</div>
                                  {cell?.expiry_date && (
                                    <div className="text-xs mt-1">
                                      Exp: {new Date(cell.expiry_date).toLocaleDateString('en-GB')}
                                    </div>
                                  )}
                                </div>
                              ) : cell?.status === 'na' ? (
                                <div className={`p-2 rounded ${statusDisplay.color}`}>
                                  <div className="font-semibold text-sm">N/A</div>
                                </div>
                              ) : cell?.completion_date ? (
                                <div className={`p-2 rounded ${dateColor}`}>
                                  <div className="font-semibold">
                                    {new Date(cell.completion_date).toLocaleDateString('en-GB')}
                                  </div>
                                  {!isOneOff && cell.expiry_date && (
                                    <div className="text-xs mt-1">
                                      Exp: {new Date(cell.expiry_date).toLocaleDateString('en-GB')}
                                    </div>
                                  )}
                                  {isOneOff && (
                                    <div className="text-xs mt-1 font-medium">
                                      One-Off
                                    </div>
                                  )}
                                  {!isOneOff && !cell.expiry_date && (
                                    <div className="text-xs mt-1 font-medium">
                                      (No expiry)
                                    </div>
                                  )}
                                </div>
                              ) : cell?.expiry_date ? (
                                <div className={`p-2 rounded ${dateColor}`}>
                                  <div className="font-semibold text-sm">{statusDisplay.label}</div>
                                  <div className="text-xs mt-1">
                                    Exp: {new Date(cell.expiry_date).toLocaleDateString('en-GB')}
                                  </div>
                                </div>
                              ) : (
                                <div className={`text-gray-500 text-xs`}>—</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal - Rendered at top level */}
      {editingCell && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 ${isDark ? 'bg-black/50' : 'bg-black/30'}`} onClick={() => {
          setEditingCell(null);
          setEditDate('');
          setEditStatus(null);
        }}>
          <div className={`rounded-lg p-6 shadow-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} relative z-50 w-96`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Update Training Record</h3>
            
            {/* Status Selection */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Status</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setEditStatus('completed')}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    editStatus === 'completed'
                      ? isDark ? 'bg-green-600 text-white' : 'bg-green-500 text-white'
                      : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  In Date
                </button>
                <button
                  onClick={() => setEditStatus('booked')}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    editStatus === 'booked'
                      ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                      : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Booked
                </button>
                <button
                  onClick={() => setEditStatus('awaiting')}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    editStatus === 'awaiting'
                      ? isDark ? 'bg-yellow-600 text-white' : 'bg-yellow-500 text-white'
                      : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Awaiting Date
                </button>
                <button
                  onClick={() => setEditStatus('na')}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    editStatus === 'na'
                      ? isDark ? 'bg-gray-600 text-white' : 'bg-gray-400 text-white'
                      : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  N/A
                </button>
              </div>
            </div>

            {/* Completion Date - Only show for "Completed" status */}
            {editStatus === 'completed' && (
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Completion Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} text-sm`}
                  autoFocus
                />
                <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Expiry date will be calculated automatically</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (editStatus === 'completed' && !editDate) {
                    alert('Please select a completion date for this training');
                    return;
                  }
                  if (!editStatus) {
                    alert('Please select a status');
                    return;
                  }
                  const staffMember = staff.find(s => s.id === editingCell.staffId);
                  const course = courses.find(c => c.id === editingCell.courseId);
                  const cell = matrixData[editingCell.staffId]?.[editingCell.courseId];
                  if (staffMember && course) {
                    handleSaveTraining(staffMember.id, course.id, cell?.training_id || null, editStatus === 'completed' ? editDate : null, editStatus);
                  }
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors duration-150 font-medium text-sm"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingCell(null);
                  setEditDate('');
                  setEditStatus(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors duration-150 font-medium text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  async function updateAllExpiriesForCourse(courseId: string, newExpiryMonths: number, neverExpires: boolean = false) {
    try {
      // Get all training records for this course that have completion dates - WITH PAGINATION
      let allTrainings: any[] = [];
      let pageNum = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: trainingPage, error: pageError } = await supabase
          .from('staff_training_matrix')
          .select('id, completion_date')
          .eq('course_id', courseId)
          .not('completion_date', 'is', null)
          .range(pageNum * pageSize, (pageNum + 1) * pageSize - 1);

        if (pageError) throw pageError;

        if (!trainingPage || trainingPage.length === 0) {
          hasMore = false;
        } else {
          allTrainings = allTrainings.concat(trainingPage);
          pageNum++;
          if (trainingPage.length < pageSize) {
            hasMore = false;
          }
        }
      }

      console.log(`Updating ${allTrainings.length} training records for course ${courseId}`);

      if (allTrainings && allTrainings.length > 0) {
        // Update each training record with new expiry date
        const updates = allTrainings.map(training => {
          let expiryDateString: string | null = null;
          
          if (!neverExpires) {
            const completionDate = new Date(training.completion_date);
            const expiryDate = new Date(completionDate);
            expiryDate.setMonth(expiryDate.getMonth() + newExpiryMonths);
            expiryDateString = expiryDate.toISOString().split('T')[0];
          }

          return supabase
            .from('staff_training_matrix')
            .update({ expiry_date: expiryDateString })
            .eq('id', training.id);
        });

        await Promise.all(updates);
      }
      // Fetch updated data after updates complete
      await fetchMatrixData();
    } catch (error) {
      console.error('Error updating expiry dates:', error);
      alert('Error updating expiry dates');
    }
  }

  async function handleSaveTraining(staffId: string, courseId: string, trainingId: string | null, completionDate: string | null = null, status: 'completed' | 'booked' | 'awaiting' | 'na' = 'completed') {
    try {
      // Verify selectedLocation is set - if not, this will cause the record to not appear on refresh
      if (!selectedLocation || selectedLocation.trim() === '') {
        alert('Please select a location before saving training records');
        return;
      }

      // Find the course to get expiry_months and never_expires
      const course = courses.find(c => c.id === courseId);
      const expiryMonths = course?.expiry_months || 12;
      const neverExpires = course?.never_expires || false;

      const existingCell = matrixData[staffId]?.[courseId];
      let effectiveCompletionDate = completionDate;

      // Calculate expiry date only if completed with a date
      let expiryDateString: string | null = null;
      if (status === 'completed' && completionDate && !neverExpires) {
        const compDate = new Date(completionDate);
        const expiryDate = new Date(compDate);
        expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);
        expiryDateString = expiryDate.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (status === 'booked' && existingCell?.expiry_date) {
        // Preserve existing expiry when switching to booked
        expiryDateString = existingCell.expiry_date;
        if (!effectiveCompletionDate && existingCell.completion_date) {
          effectiveCompletionDate = existingCell.completion_date;
        }
      }

      console.log('Saving training:', {
        staffId,
        courseId,
        trainingId,
        completion_date: completionDate,
        expiry_date: expiryDateString,
        status: status,
        completed_at_location_id: selectedLocation,
      });

      // Use upsert to handle both insert and update cases
      // Important: Do NOT include 'id' field - let database auto-generate for new records
      const upsertData: any = {
        staff_id: staffId,
        course_id: courseId,
        completion_date: effectiveCompletionDate || null,
        expiry_date: expiryDateString,
        completed_at_location_id: selectedLocation,
        status: status,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('staff_training_matrix')
        .upsert(upsertData, { onConflict: 'staff_id,course_id' })
        .select();

      console.log('Upsert response:', { data, error });

      if (error) {
        console.error('Save error:', error);
        alert(`Error saving training: ${error.message}`);
        return;
      }
      
      if (!data || data.length === 0) {
        console.error('No data returned from upsert');
        alert('Error: Record was not saved. Please try again.');
        return;
      }

      // Verify the record was actually saved by fetching it directly
      const savedRecordId = data[0].id;
      const { data: verifyData, error: verifyError } = await supabase
        .from('staff_training_matrix')
        .select('*')
        .eq('id', savedRecordId);
      
      console.log('Verification fetch for record', savedRecordId, ':', verifyData);
      
      console.log('Upsert saved record:', {
        id: data[0].id,
        staff_id: data[0].staff_id,
        course_id: data[0].course_id,
        completed_at_location_id: data[0].completed_at_location_id,
      });
      console.log('Save successful:', data);

      // Immediately update the matrix with the newly saved record
      // This ensures it appears even if the database fetch doesn't include it yet
      if (data && data.length > 0) {
        const savedRecord = data[0];
        const updatedMatrix = { ...matrixData };
        if (!updatedMatrix[staffId]) {
          updatedMatrix[staffId] = {};
        }
        updatedMatrix[staffId][courseId] = {
          completion_date: savedRecord.completion_date,
          expiry_date: savedRecord.expiry_date,
          training_id: savedRecord.id,
          status: savedRecord.status,
        };
        setMatrixData(updatedMatrix);
        console.log('Matrix updated with new record immediately');
      }

      setEditingCell(null);
      alert('Training record saved successfully!');
    } catch (error) {
      console.error('Error saving training:', error);
      alert(`Error saving training record: ${error}`);
    }
  }
}
