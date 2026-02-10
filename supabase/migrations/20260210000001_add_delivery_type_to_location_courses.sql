-- Add delivery_type column to location_courses table
-- This will store the delivery method or section header from CSV files

ALTER TABLE location_courses
ADD COLUMN delivery_type VARCHAR(255) DEFAULT 'Face to Face';

-- Create an index for filtering by delivery type
CREATE INDEX idx_location_courses_delivery_type ON location_courses(delivery_type);

COMMENT ON COLUMN location_courses.delivery_type IS 'Delivery type or section header from CSV: e.g., Careskills Wave 1, Online, Face to Face, etc.';
