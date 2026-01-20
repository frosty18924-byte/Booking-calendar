-- Add office/region field to locations table
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS office_region TEXT DEFAULT 'Hull';

-- Add office/region field to venues table to link them to their office
ALTER TABLE venues
ADD COLUMN IF NOT EXISTS office_region TEXT DEFAULT 'Hull';

-- Add venue_id field to training_events to link events to venues
ALTER TABLE training_events
ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id);

-- Create a comment explaining the fields
COMMENT ON COLUMN locations.office_region IS 'Office region: Hull or Norwich';
COMMENT ON COLUMN venues.office_region IS 'Office region: Hull or Norwich';
COMMENT ON COLUMN training_events.venue_id IS 'Foreign key to venues table';
