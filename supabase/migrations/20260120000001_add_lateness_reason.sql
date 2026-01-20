-- Migration to add lateness reason
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS lateness_reason TEXT;
