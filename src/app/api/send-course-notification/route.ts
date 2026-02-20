import { NextRequest, NextResponse } from 'next/server';
import { getEmailSendOptionsFromHeaders, sendBulkEmail } from '@/lib/email';
import { createServiceClient, requireRole } from '@/lib/apiAuth';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requireRole(['admin', 'scheduler']);
    if ('error' in authz) return authz.error;

    const { eventId, notifyAllStaff = false } = await request.json();
    const emailOptions = getEmailSendOptionsFromHeaders(
      request.headers.get('x-email-test-mode'),
      request.headers.get('x-test-email-address')
    );

    const supabase = createServiceClient();

    // Get event details
    const { data: event } = await supabase
      .from('training_events')
      .select('event_date, start_time, end_time, location, courses(name)')
      .eq('id', eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // If notifyAllStaff is true, get all staff emails and send bulk email
    if (notifyAllStaff) {
      const { data: staffList } = await supabase
        .from('profiles')
        .select('email, full_name')
        .neq('email', null)
        .eq('is_deleted', false);

      if (!staffList || staffList.length === 0) {
        return NextResponse.json({ error: 'No staff found' }, { status: 404 });
      }

      const emails = staffList.map(s => s.email);
      const courseRelation = event.courses as { name?: string } | null;
      const courseName = courseRelation?.name || 'Unknown Course';
      const safeCourseName = escapeHtml(courseName);
      const safeDate = escapeHtml(new Date(event.event_date).toLocaleDateString());
      const safeStartTime = escapeHtml(String(event.start_time || ''));
      const safeEndTime = escapeHtml(String(event.end_time || ''));
      const safeLocation = escapeHtml(String(event.location || ''));
      const htmlContent = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #dbeafe; border-radius: 10px; background-color: #f0f9ff;">
          <h2 style="color: #0284c7;">New Training Course Available</h2>
          <p>Hi,</p>
          <p>A new training course has been scheduled:</p>
          <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>📚 Course:</strong> ${safeCourseName}</p>
            <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${safeDate}</p>
            <p style="margin: 5px 0;"><strong>⏰ Time:</strong> ${safeStartTime} - ${safeEndTime}</p>
            <p style="margin: 5px 0;"><strong>📍 Location:</strong> ${safeLocation}</p>
          </div>
          <p>Log in to the training portal to book your place.</p>
        </div>
      `;

      const success = await sendBulkEmail(
        emails,
        `New Course Scheduled: ${courseName}`,
        htmlContent,
        emailOptions
      );

      if (!success) {
        return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: `Course notification sent to ${emails.length} staff members` 
      });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
