-- Add category column to courses table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Add index for faster category queries
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
