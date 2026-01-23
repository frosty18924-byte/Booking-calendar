-- Add capacity check constraint to prevent overbooking at database level
-- This trigger ensures capacity is never exceeded, even with concurrent requests

CREATE OR REPLACE FUNCTION check_booking_capacity()
RETURNS TRIGGER AS $$
DECLARE
  event_record RECORD;
  current_count INT;
  max_capacity INT;
  override_capacity INT;
BEGIN
  -- Get event and course details
  SELECT te.id, te.course_id, te.event_date, c.max_attendees
  INTO event_record
  FROM training_events te
  JOIN courses c ON te.course_id = c.id
  WHERE te.id = NEW.event_id;

  IF event_record IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Get base max capacity from course
  max_capacity := event_record.max_attendees;

  -- Check if there's an override for this course on this date
  SELECT max_attendees INTO override_capacity
  FROM course_event_overrides
  WHERE course_id = event_record.course_id
    AND event_date = event_record.event_date
  LIMIT 1;

  -- Use override if it exists
  IF override_capacity IS NOT NULL THEN
    max_capacity := override_capacity;
  END IF;

  -- Count current bookings for this event
  SELECT COUNT(*) INTO current_count
  FROM bookings
  WHERE event_id = NEW.event_id;

  -- Check if adding this booking would exceed capacity
  IF current_count >= max_capacity THEN
    RAISE EXCEPTION 'Course is at full capacity (%) - cannot add more staff', max_capacity;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS enforce_booking_capacity ON bookings;

-- Create trigger that fires BEFORE insert
CREATE TRIGGER enforce_booking_capacity
BEFORE INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION check_booking_capacity();

-- Comment explaining the constraint
COMMENT ON TRIGGER enforce_booking_capacity ON bookings IS 
'Prevents overbooking by checking capacity before each insert. 
This runs at database level and prevents race conditions even with concurrent requests.';
