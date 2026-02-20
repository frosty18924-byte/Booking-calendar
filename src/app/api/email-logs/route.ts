import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, requireRole } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
  try {
    const authz = await requireRole(['admin', 'scheduler']);
    if ('error' in authz) return authz.error;

    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get('limit') || '100');
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(500, limitParam)) : 100;

    const { data, error } = await supabase
      .from('email_logs')
      .select('id, created_at, subject, status, test_mode, provider, message_id, error_text, original_recipients, delivered_recipients')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch email logs:', error);
      if (error.code === 'PGRST205') {
        return NextResponse.json({ success: true, logs: [], warning: 'email_logs table not available yet' });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, logs: data || [] });
  } catch (error) {
    console.error('Email logs API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
