-- Add expiry_months column to courses table if it doesn't exist
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS expiry_months INTEGER DEFAULT 12;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_courses_expiry_months ON courses(expiry_months);
