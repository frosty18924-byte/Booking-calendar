-- Note: course_id indexes will be added in a separate migration after investigation
-- CREATE INDEX IF NOT EXISTS idx_staff_training_course_id ON staff_training_matrix(course_id);
-- CREATE INDEX IF NOT EXISTS idx_location_courses_course_id ON location_courses(course_id);

-- For now, disable RLS on training matrix tables to allow import to work
-- RLS can be re-enabled with proper policies after initial data load
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE location_courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_training_matrix DISABLE ROW LEVEL SECURITY;
