-- Create a separate table for training matrix courses (Careskills courses)
-- These are different from the booking calendar courses
DROP TABLE IF EXISTS location_training_courses CASCADE;
DROP TABLE IF EXISTS training_courses CASCADE;

CREATE TABLE training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  careskills_name VARCHAR(255),
  description TEXT,
  expiry_months INT DEFAULT 12,
  never_expires BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a mapping table to link training_courses to locations
CREATE TABLE location_training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  training_course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, training_course_id)
);

-- Create indexes
CREATE INDEX idx_training_courses_name ON training_courses(name);
CREATE INDEX idx_training_courses_careskills_name ON training_courses(careskills_name);
CREATE INDEX idx_location_training_courses_location ON location_training_courses(location_id);
CREATE INDEX idx_location_training_courses_course ON location_training_courses(training_course_id);

-- Enable RLS
ALTER TABLE training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_training_courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_courses
CREATE POLICY "Enable read for all users" ON training_courses
  FOR SELECT USING (TRUE);

CREATE POLICY "Enable write for service role" ON training_courses
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- RLS Policies for location_training_courses
CREATE POLICY "Enable read for all users" ON location_training_courses
  FOR SELECT USING (TRUE);

CREATE POLICY "Enable write for service role" ON location_training_courses
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add comment to explain the difference
COMMENT ON TABLE training_courses IS 'Courses for the training matrix (Careskills). Separate from booking calendar courses.';
COMMENT ON TABLE location_training_courses IS 'Maps training courses to locations in the training matrix.';
