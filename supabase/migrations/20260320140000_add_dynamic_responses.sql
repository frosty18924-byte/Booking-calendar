-- Add dynamic responses column to course_feedback
ALTER TABLE public.course_feedback ADD COLUMN IF NOT EXISTS responses JSONB DEFAULT '{}';

-- Optional: If the table doesn't exist at all (for new environments), we'd need its full schema. 
-- But assuming it exists as per the codebase usage.
