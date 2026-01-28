import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { courseId, updates } = await request.json();

    if (!courseId || !updates) {
      return NextResponse.json(
        { error: 'Missing courseId or updates' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Updating course via RPC function:', { courseId, updates });

    // Use the stored procedure to bypass schema cache issues
    const { data, error } = await supabase.rpc('update_course_data', {
      p_course_id: courseId,
      p_updates: updates,
    });

    if (error) {
      console.error('RPC error:', error);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }

    console.log('Update successful:', data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('API error:', errorMsg);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
