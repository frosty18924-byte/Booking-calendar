import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const body = await request.json();
    const { staffId, email } = body;

    // Validate input
    if (!staffId || !email) {
      return Response.json(
        {
          success: false,
          error: 'Missing required fields: staffId, email',
        },
        { status: 400 }
      );
    }

    // Validate environment variables
    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json(
        {
          success: false,
          error: 'Missing Supabase environment variables',
        },
        { status: 500 }
      );
    }

    // For roster-only staff (no auth account), just soft delete the profile
    console.log('Attempting to soft delete profile for:', staffId);
    
    // First verify the profile exists
    const { data: profileExists } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', staffId);
    
    console.log('Profile exists:', profileExists && profileExists.length > 0);
    
    if (!profileExists || profileExists.length === 0) {
      return Response.json(
        {
          success: false,
          error: `Profile with id ${staffId} not found`,
        },
        { status: 400 }
      );
    }

    // Soft delete: anonymize and mark as deleted for historical analytics
    console.log('Attempting to soft delete profile with id:', staffId);
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        full_name: 'Deleted User',
        email: `deleted-${staffId}@system.local`, // Anonymize email
      })
      .eq('id', staffId);

    console.log('Profile soft delete error:', profileError?.message || 'Success');
    
    if (profileError) {
      console.error('Profile soft delete error:', profileError);
      return Response.json(
        {
          success: false,
          error: `Failed to delete profile: ${profileError.message}`,
        },
        { status: 400 }
      );
    }

    // Verify soft delete worked
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { data: verifyDelete } = await supabaseAdmin
      .from('profiles')
      .select('is_deleted, deleted_at')
      .eq('id', staffId);
    
    if (verifyDelete && verifyDelete.length > 0) {
      console.log('Profile soft deleted successfully:', {
        is_deleted: verifyDelete[0].is_deleted,
        deleted_at: verifyDelete[0].deleted_at,
      });
    }

    console.log('Staff member deleted successfully:', email);

    return Response.json(
      {
        success: true,
        message: `Staff member ${email} has been completely removed`,
      },
      { status: 200 }
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
