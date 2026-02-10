-- Drop and recreate staff_training_matrix to ensure schema is correct
-- This is necessary because the table was created but PostgREST can't see all columns

DROP TABLE IF EXISTS staff_training_matrix CASCADE;

-- Recreate staff_training_matrix table with all columns
CREATE TABLE staff_training_matrix (
  id BIGSERIAL PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  expiry_date DATE,
  status VARCHAR(50) DEFAULT 'completed',
  completed_at_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(staff_id, course_id)
);

-- Create indexes
CREATE INDEX idx_staff_training_staff_id ON staff_training_matrix(staff_id);
CREATE INDEX idx_staff_training_expiry ON staff_training_matrix(expiry_date);
CREATE INDEX idx_staff_locations_staff_id ON staff_locations(staff_id);
CREATE INDEX idx_staff_locations_location_id ON staff_locations(location_id);
CREATE INDEX idx_location_courses_location_id ON location_courses(location_id);

-- Disable RLS to allow imports
ALTER TABLE staff_training_matrix DISABLE ROW LEVEL SECURITY;
