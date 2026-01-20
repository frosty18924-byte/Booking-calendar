-- Migration to add absence tracking details
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS absence_reason TEXT,
ADD COLUMN IF NOT EXISTS lateness_minutes INTEGER DEFAULT 0;

-- Optional: Add check constraints or defaults if needed
-- ALTER TABLE bookings ADD CONSTRAINT check_lateness CHECK (lateness_minutes >= 0);
