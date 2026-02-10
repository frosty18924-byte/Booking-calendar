-- Add never_expires column to courses table
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS never_expires BOOLEAN DEFAULT FALSE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_courses_never_expires ON courses(never_expires);

-- Add comment for documentation
COMMENT ON COLUMN courses.never_expires IS 'When TRUE, this course never expires regardless of expiry_months value';
