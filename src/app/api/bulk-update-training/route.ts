import { NextRequest } from 'next/server';
import { createServiceClient, requireRole } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

interface BulkUpdateRequest {
  staffId: string;
  courseId: string;
  locationId: string;
  status: 'completed' | 'allocated' | 'not_yet_due' | 'na' | null;
  completion_date: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requireRole(['admin', 'scheduler']);
    if ('error' in authz) return authz.error;

    const supabaseAdmin = createServiceClient();
    const body = await request.json();
    const { updates } = body;

    // Validate input
    if (!Array.isArray(updates) || updates.length === 0) {
      return Response.json(
        {
          success: false,
          error: 'Invalid updates: must be a non-empty array',
        },
        { status: 400 }
      );
    }

    // Get the course details for expiry calculations
    const courseIds = [...new Set(updates.map((u: BulkUpdateRequest) => u.courseId))];
    const { data: courses } = await supabaseAdmin
      .from('courses')
      .select('id, expiry_months, never_expires')
      .in('id', courseIds);

    const courseMap = new Map();
    courses?.forEach((c: any) => {
      courseMap.set(c.id, c);
    });

    // Get the location ID from the first update
    const locationId = updates[0]?.locationId;
    if (!locationId) {
      return Response.json(
        {
          success: false,
          error: 'Invalid updates: missing locationId',
        },
        { status: 400 }
      );
    }

    // Process each update
    const results = [];
    let successCount = 0;

    // First, ensure all staff are in staff_locations for this location
    const staffIds = [...new Set(updates.map((u: BulkUpdateRequest) => u.staffId))];
    
    for (const staffId of staffIds) {
      // Upsert into staff_locations to ensure they're visible in the matrix
      const { error: staffLocError } = await supabaseAdmin
        .from('staff_locations')
        .upsert(
          {
            staff_id: staffId,
            location_id: locationId,
            display_order: 9999, // Default to bottom
          },
          { onConflict: 'staff_id,location_id' }
        );

      if (staffLocError) {
        console.warn(`Warning: Could not add ${staffId} to staff_locations:`, staffLocError.message);
      }
    }

    for (const update of updates) {
      try {
        const { staffId, courseId, locationId, status, completion_date } = update as BulkUpdateRequest;

        // Calculate expiry date if status is 'completed'
        let expiryDate = null;
        if (status === 'completed' && completion_date) {
          const course = courseMap.get(courseId);
          if (course && !course.never_expires && course.expiry_months) {
            const completionDate = new Date(completion_date);
            completionDate.setMonth(completionDate.getMonth() + course.expiry_months);
            expiryDate = completionDate.toISOString().split('T')[0];
          }
        }

        // Use upsert like handleSaveTraining does - more reliable than manual check
        const upsertData: any = {
          staff_id: staffId,
          course_id: courseId,
          completion_date: status === 'completed' ? completion_date : null,
          expiry_date: expiryDate,
          completed_at_location_id: locationId,
          status: status,
          updated_at: new Date().toISOString(),
        };

        let { data, error } = await supabaseAdmin
          .from('staff_training_matrix')
          .upsert(upsertData, { onConflict: 'staff_id,course_id,completed_at_location_id' })
          .select();

        // Support deployments that still use the older two-column unique key
        if (error?.code === '42P10') {
          const fallback = await supabaseAdmin
            .from('staff_training_matrix')
            .upsert(upsertData, { onConflict: 'staff_id,course_id' })
            .select();
          data = fallback.data;
          error = fallback.error;
        }

        if (error) {
          console.error(`Error upserting record for ${staffId}-${courseId}:`, JSON.stringify(error));
          results.push({ staffId, courseId, success: false, error: error.message || JSON.stringify(error) });
        } else {
          successCount++;
          results.push({ staffId, courseId, success: true });
        }
      } catch (error) {
        console.error('Error processing individual update:', error);
        results.push({
          staffId: update.staffId,
          courseId: update.courseId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Check if all were successful
    const failedCount = results.filter((r: any) => !r.success).length;

    return Response.json(
      {
        success: failedCount === 0,
        message: `Updated ${successCount}/${updates.length} training records`,
        successCount,
        failedCount,
        results: failedCount > 0 ? results : undefined,
      },
      { status: failedCount === 0 ? 200 : 207 }
    );
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown server error',
      },
      { status: 500 }
    );
  }
}
