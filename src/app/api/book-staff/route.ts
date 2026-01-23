import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { eventId, staffIds } = await request.json();

    if (!eventId || !staffIds || staffIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing eventId or staffIds' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get event details
    const { data: event, error: eventError } = await supabaseAdmin
      .from('training_events')
      .select('*, courses(max_attendees)')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const courseMaxAttendees = event.courses?.max_attendees || 10;

    // Check for course overrides for this event date
    const { data: overrides } = await supabaseAdmin
      .from('course_event_overrides')
      .select('max_attendees')
      .eq('course_id', event.course_id)
      .eq('event_date', event.event_date);

    // Use override if it exists for this date
    const maxCapacity = overrides && overrides.length > 0 
      ? overrides[0].max_attendees 
      : courseMaxAttendees;

    // Count current bookings for this event
    const { data: currentBookings, error: bookingCountError } = await supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact' })
      .eq('event_id', eventId);

    if (bookingCountError) {
      return NextResponse.json(
        { error: 'Failed to check current bookings' },
        { status: 500 }
      );
    }

    const currentCount = currentBookings?.length || 0;
    const totalAfterBooking = currentCount + staffIds.length;

    // Validate capacity
    if (totalAfterBooking > maxCapacity) {
      const availableSpots = maxCapacity - currentCount;
      return NextResponse.json(
        {
          error: `Capacity exceeded! Course capacity: ${maxCapacity}, Current bookings: ${currentCount}, Trying to add: ${staffIds.length}, Available spots: ${Math.max(0, availableSpots)}`,
          currentCount,
          maxCapacity,
          availableSpots: Math.max(0, availableSpots),
          tryingToAdd: staffIds.length,
          wouldExceedBy: totalAfterBooking - maxCapacity
        },
        { status: 400 }
      );
    }

    // Check if any staff are already booked for this event
    const { data: existingBookings } = await supabaseAdmin
      .from('bookings')
      .select('profile_id')
      .eq('event_id', eventId)
      .in('profile_id', staffIds);

    const alreadyBookedIds = existingBookings?.map(b => b.profile_id) || [];
    const newStaffIds = staffIds.filter((id: string) => !alreadyBookedIds.includes(id));

    if (newStaffIds.length === 0) {
      return NextResponse.json(
        { error: 'All selected staff are already booked for this event' },
        { status: 400 }
      );
    }

    // All validations passed - create bookings
    const bookingData = newStaffIds.map((id: string) => ({
      event_id: eventId,
      profile_id: id
    }));

    const { error: insertError } = await supabaseAdmin
      .from('bookings')
      .insert(bookingData);

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to create bookings: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${newStaffIds.length} staff member(s) booked successfully`,
      bookedCount: newStaffIds.length,
      newCapacityCount: currentCount + newStaffIds.length,
      maxCapacity
    });
  } catch (error: any) {
    console.error('Booking error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
