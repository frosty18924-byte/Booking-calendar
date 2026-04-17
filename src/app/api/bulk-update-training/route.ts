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

    // Process each update
    const results = [];
    let successCount = 0;

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

        // Check if record exists - use completed_at_location_id to match what's in the database
        const { data: existingRecord } = await supabaseAdmin
          .from('staff_training_matrix')
          .select('id')
          .eq('staff_id', staffId)
          .eq('course_id', courseId)
          .eq('completed_at_location_id', locationId)
          .single();

        if (existingRecord) {
          // Update existing record
          const { error: updateError } = await supabaseAdmin
            .from('staff_training_matrix')
            .update({
              status,
              completion_date: status === 'completed' ? completion_date : null,
              expiry_date: expiryDate,
              completed_at_location_id: locationId,
            })
            .eq('id', existingRecord.id);

          if (updateError) {
            console.error(`Error updating record for ${staffId}-${courseId}:`, updateError);
            results.push({ staffId, courseId, success: false, error: updateError.message });
          } else {
            successCount++;
            results.push({ staffId, courseId, success: true });
          }
        } else {
          // Create new record
          const { error: insertError } = await supabaseAdmin
            .from('staff_training_matrix')
            .insert({
              staff_id: staffId,
              course_id: courseId,
              location_id: locationId,
              completed_at_location_id: locationId,
              status,
              completion_date: status === 'completed' ? completion_date : null,
              expiry_date: expiryDate,
            });

          if (insertError) {
            console.error(`Error inserting record for ${staffId}-${courseId}:`, insertError);
            results.push({ staffId, courseId, success: false, error: insertError.message });
          } else {
            successCount++;
            results.push({ staffId, courseId, success: true });
          }
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
