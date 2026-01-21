import { NextRequest, NextResponse } from 'next/server';
import { sendBookingEmail } from '@/lib/email';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { staffId, eventId } = await request.json();
    console.log('Booking confirmation request:', { staffId, eventId });

    // Initialize Supabase with service role key for backend operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get staff details
    const { data: staff } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', staffId)
      .single();

    if (!staff?.email) {
      console.error('Staff email not found for staffId:', staffId);
      return NextResponse.json({ error: 'Staff email not found' }, { status: 404 });
    }

    console.log('Staff found:', { email: staff.email, name: staff.full_name });

    // Get event details
    const { data: event } = await supabase
      .from('training_events')
      .select('event_date, courses(name)')
      .eq('id', eventId)
      .single();

    if (!event) {
      console.error('Event not found for eventId:', eventId);
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    console.log('Event found:', { date: event.event_date, course: event.courses?.name });

    // Send email
    console.log('Sending email to:', staff.email);
    const success = await sendBookingEmail(
      staff.email,
      staff.full_name || 'Staff Member',
      event.courses?.name || 'Unknown Course',
      event.event_date
    );

    console.log('Email send result:', success);

    if (!success) {
      console.error('Email failed to send');
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Email sent' });
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
