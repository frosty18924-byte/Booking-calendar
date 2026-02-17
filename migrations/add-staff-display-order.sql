-- Add display_order column to staff_locations
ALTER TABLE staff_locations ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Create table for matrix dividers (section headers)
CREATE TABLE IF NOT EXISTS location_matrix_dividers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_location_matrix_dividers_location ON location_matrix_dividers(location_id);
CREATE INDEX IF NOT EXISTS idx_staff_locations_display_order ON staff_locations(location_id, display_order);
