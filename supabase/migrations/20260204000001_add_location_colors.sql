-- Add color field to locations table for UI styling
-- Colors will be hex codes for CSS styling
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';

COMMENT ON COLUMN locations.color IS 'Hex color code for UI styling of this location (e.g., #3B82F6)';
