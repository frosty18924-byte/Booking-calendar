-- Fix the unique constraint on staff_training_matrix
-- Change from UNIQUE(staff_id, course_id) to UNIQUE(staff_id, course_id, completed_at_location_id)
-- This allows the same staff to have the same course at different locations

-- First, drop the existing constraint
ALTER TABLE staff_training_matrix 
DROP CONSTRAINT staff_training_matrix_staff_id_course_id_key;

-- Add the correct constraint with location
ALTER TABLE staff_training_matrix 
ADD CONSTRAINT staff_training_matrix_staff_id_course_id_location_id_key 
UNIQUE(staff_id, course_id, completed_at_location_id);
