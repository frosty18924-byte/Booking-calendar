-- Update staff_training_matrix to reference training_courses instead of courses
-- This migration handles the data migration and updates the foreign key reference

-- Step 1: Copy existing courses data to training_courses
INSERT INTO training_courses (id, name, careskills_name, expiry_months)
SELECT id, name, name as careskills_name, COALESCE(expiry_months, 12)
FROM courses
ON CONFLICT (name) DO NOTHING;

-- Step 2: Temporarily drop the constraint
ALTER TABLE staff_training_matrix 
DROP CONSTRAINT IF EXISTS staff_training_matrix_course_id_fkey;

-- Step 3: Add the new constraint pointing to training_courses
ALTER TABLE staff_training_matrix
ADD CONSTRAINT staff_training_matrix_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES training_courses(id) ON DELETE CASCADE;

-- Step 4: Add a new column to store the booking calendar course_id if needed
ALTER TABLE staff_training_matrix 
ADD COLUMN IF NOT EXISTS booking_course_id UUID REFERENCES courses(id) ON DELETE SET NULL;

COMMENT ON COLUMN staff_training_matrix.course_id IS 'References training_courses table (Careskills courses)';
COMMENT ON COLUMN staff_training_matrix.booking_course_id IS 'Optional reference to booking calendar course';
