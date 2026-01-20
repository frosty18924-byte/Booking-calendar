-- Add accessible_office_regions field to locations table
-- This stores which office regions (Hull, Norwich, or both) each location can access
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS accessible_office_regions TEXT[] DEFAULT ARRAY['Hull'];

COMMENT ON COLUMN locations.accessible_office_regions IS 'Array of office regions this location can access: [Hull], [Norwich], or [Hull, Norwich]';
