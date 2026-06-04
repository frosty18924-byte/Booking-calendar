-- Add display_order column to location_training_courses for CSV import ordering
ALTER TABLE location_training_courses ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999;

-- Add display_order column to staff_locations for CSV import ordering
ALTER TABLE staff_locations ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999;

-- Create indexes for efficient ordering
CREATE INDEX IF NOT EXISTS idx_location_training_courses_display_order 
  ON location_training_courses(location_id, display_order);

CREATE INDEX IF NOT EXISTS idx_staff_locations_display_order 
  ON staff_locations(location_id, display_order);
