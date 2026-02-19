import { NextRequest, NextResponse } from 'next/server';
import { sendBookingCancellationEmail } from '@/lib/email';
import { createServiceClient, requireRole } from '@/lib/apiAuth';

export async function POST(request: NextRequest) {
  try {
    const authz = await requireRole(['admin', 'scheduler']);
    if ('error' in authz) return authz.error;

    const { staffId, eventId, reason } = await request.json();

    const supabase = createServiceClient();

    // Get staff details
    const { data: staff } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', staffId)
      .single();

    if (!staff?.email) {
      return NextResponse.json({ error: 'Staff email not found' }, { status: 404 });
    }

    // Get event details
    const { data: event } = await supabase
      .from('training_events')
      .select('event_date, courses(name)')
      .eq('id', eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Send email
    const success = await sendBookingCancellationEmail(
      staff.email,
      staff.full_name || 'Staff Member',
      (event.courses as any)?.name || 'Unknown Course',
      event.event_date,
      reason
    );

    if (!success) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Cancellation email sent' });
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
