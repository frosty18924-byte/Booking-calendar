import { NextRequest, NextResponse } from 'next/server';
import { sendCourseScheduledEmail, sendBulkEmail } from '@/lib/email';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { eventId, notifyAllStaff = false } = await request.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
        .neq('email', null);

      if (!staffList || staffList.length === 0) {
        return NextResponse.json({ error: 'No staff found' }, { status: 404 });
      }

      const emails = staffList.map(s => s.email);
      const htmlContent = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #dbeafe; border-radius: 10px; background-color: #f0f9ff;">
          <h2 style="color: #0284c7;">New Training Course Available</h2>
          <p>Hi,</p>
          <p>A new training course has been scheduled:</p>
          <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>📚 Course:</strong> ${event.courses?.name}</p>
            <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${new Date(event.event_date).toLocaleDateString()}</p>
            <p style="margin: 5px 0;"><strong>⏰ Time:</strong> ${event.start_time} - ${event.end_time}</p>
            <p style="margin: 5px 0;"><strong>📍 Location:</strong> ${event.location}</p>
          </div>
          <p>Log in to the training portal to book your place.</p>
        </div>
      `;

      const success = await sendBulkEmail(
        emails,
        `New Course Scheduled: ${event.courses?.name}`,
        htmlContent
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
