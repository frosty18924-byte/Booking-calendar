-- Create training_courses table (using 'courses' as documented)
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  platform VARCHAR(50),
  is_core BOOLEAN DEFAULT FALSE,
  expiry_months INT DEFAULT 12,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create location_courses table (link courses to locations)
CREATE TABLE IF NOT EXISTS location_courses (
  id BIGSERIAL PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(location_id, course_id)
);

-- Create staff_locations table (formerly staff_training_locations)
CREATE TABLE IF NOT EXISTS staff_locations (
  id BIGSERIAL PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  role VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(staff_id, location_id)
);

-- Create staff_training_matrix table
CREATE TABLE IF NOT EXISTS staff_training_matrix (
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

-- Create function to calculate expiry_date
-- Note: This will be added in a follow-up migration
-- CREATE OR REPLACE FUNCTION calculate_expiry_date()
-- RETURNS TRIGGER AS $$
-- DECLARE
--   v_expiry_months INT;
-- BEGIN
--   IF NEW.course_id IS NOT NULL AND NEW.completion_date IS NOT NULL THEN
--     SELECT expiry_months INTO v_expiry_months
--     FROM courses
--     WHERE id = NEW.course_id;
--     
--     IF v_expiry_months IS NOT NULL THEN
--       NEW.expiry_date := NEW.completion_date + (INTERVAL '1 month' * v_expiry_months);
--     END IF;
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- Create trigger to set expiry_date on insert/update
-- DROP TRIGGER IF EXISTS set_expiry_date_trigger ON staff_training_matrix;
-- CREATE TRIGGER set_expiry_date_trigger
-- BEFORE INSERT OR UPDATE ON staff_training_matrix
-- FOR EACH ROW
-- EXECUTE FUNCTION calculate_expiry_date();

-- Create indexes
-- These will be added in a follow-up migration
-- CREATE INDEX IF NOT EXISTS idx_staff_training_staff_id ON staff_training_matrix(staff_id);
-- CREATE INDEX IF NOT EXISTS idx_staff_training_course_id ON staff_training_matrix(course_id);
-- CREATE INDEX IF NOT EXISTS idx_staff_training_expiry ON staff_training_matrix(expiry_date);
-- CREATE INDEX IF NOT EXISTS idx_staff_locations_staff_id ON staff_locations(staff_id);
-- CREATE INDEX IF NOT EXISTS idx_staff_locations_location_id ON staff_locations(location_id);
-- CREATE INDEX IF NOT EXISTS idx_location_courses_location_id ON location_courses(location_id);
-- CREATE INDEX IF NOT EXISTS idx_location_courses_course_id ON location_courses(course_id);

-- Enable RLS
-- Temporarily disabled - will be enabled in follow-up migration once all columns are accessible
-- ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE location_courses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE staff_locations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE staff_training_matrix ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- These will be added in a follow-up migration
-- DROP POLICY IF EXISTS "Allow authenticated to read courses" ON courses;
-- CREATE POLICY "Allow authenticated to read courses" ON courses
--   FOR SELECT USING (true);

-- DROP POLICY IF EXISTS "Allow authenticated to read location_courses" ON location_courses;
-- CREATE POLICY "Allow authenticated to read location_courses" ON location_courses
--   FOR SELECT USING (true);

-- DROP POLICY IF EXISTS "Allow authenticated to read staff_locations" ON staff_locations;
-- CREATE POLICY "Allow authenticated to read staff_locations" ON staff_locations
--   FOR SELECT USING (true);

-- DROP POLICY IF EXISTS "Allow authenticated to read staff_training_matrix" ON staff_training_matrix;
-- CREATE POLICY "Allow authenticated to read staff_training_matrix" ON staff_training_matrix
--   FOR SELECT USING (true);

-- DROP POLICY IF EXISTS "Allow admins to update training matrix" ON staff_training_matrix;
-- CREATE POLICY "Allow admins to update training matrix" ON staff_training_matrix
--   FOR UPDATE USING (true);

-- DROP POLICY IF EXISTS "Allow admins to insert training matrix" ON staff_training_matrix;
-- CREATE POLICY "Allow admins to insert training matrix" ON staff_training_matrix
--   FOR INSERT WITH CHECK (true);
