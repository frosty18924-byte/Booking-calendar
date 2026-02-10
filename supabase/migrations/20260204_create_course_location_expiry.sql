-- Create course_location_expiry table for location-specific course expiration periods
CREATE TABLE IF NOT EXISTS course_location_expiry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  expiry_months INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, course_id)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_course_location_expiry_location ON course_location_expiry(location_id);
CREATE INDEX IF NOT EXISTS idx_course_location_expiry_course ON course_location_expiry(course_id);
CREATE INDEX IF NOT EXISTS idx_course_location_expiry_composite ON course_location_expiry(location_id, course_id);

-- Enable RLS
ALTER TABLE course_location_expiry ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all" ON course_location_expiry
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for service role" ON course_location_expiry
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable update for service role" ON course_location_expiry
  FOR UPDATE USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable delete for service role" ON course_location_expiry
  FOR DELETE USING (auth.role() = 'service_role');
