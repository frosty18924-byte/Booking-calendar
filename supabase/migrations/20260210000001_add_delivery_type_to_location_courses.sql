-- Add delivery_type column to location_courses table
-- This will store the delivery method from CSV files (Online, Face to Face, Atlas, etc.)

ALTER TABLE location_courses
ADD COLUMN delivery_type VARCHAR(50) DEFAULT 'Face to Face';

-- Create an index for filtering by delivery type
CREATE INDEX idx_location_courses_delivery_type ON location_courses(delivery_type);

COMMENT ON COLUMN location_courses.delivery_type IS 'Delivery type from CSV: Online, Face to Face, Atlas, Workshop, Classroom, etc.';
