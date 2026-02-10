-- Add indexes for training matrix tables
CREATE INDEX IF NOT EXISTS idx_staff_training_staff_id ON staff_training_matrix(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_training_expiry ON staff_training_matrix(expiry_date);
CREATE INDEX IF NOT EXISTS idx_staff_locations_staff_id ON staff_locations(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_locations_location_id ON staff_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_location_courses_location_id ON location_courses(location_id);
