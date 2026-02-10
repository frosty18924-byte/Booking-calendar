-- Add display_order column to courses table for CSV import ordering
ALTER TABLE courses ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'courses' AND column_name = 'display_order';
