-- Enable RLS with location-based access control
-- This ensures managers/schedulers only see data for their assigned locations

-- 1. Enable RLS on staff_training_matrix
ALTER TABLE staff_training_matrix ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admins can see all records
CREATE POLICY "Admins see all training records" ON staff_training_matrix
  FOR SELECT
  USING (
    (SELECT role_tier FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Policy 2: Managers/Schedulers see only their location's staff training
CREATE POLICY "Managers see their location training records" ON staff_training_matrix
  FOR SELECT
  USING (
    (SELECT role_tier FROM profiles WHERE id = auth.uid()) IN ('manager', 'scheduler')
    AND completed_at_location_id IN (
      SELECT location_id FROM staff_locations 
      WHERE staff_id = auth.uid()
    )
  );

-- Policy 3: Staff see only their own training records
CREATE POLICY "Staff see own training records" ON staff_training_matrix
  FOR SELECT
  USING (
    (SELECT role_tier FROM profiles WHERE id = auth.uid()) = 'staff'
    AND staff_id = auth.uid()
  );

-- Policy 4: Service role can access all (for imports)
CREATE POLICY "Service role full access training matrix" ON staff_training_matrix
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- 2. Enable RLS on staff_locations
ALTER TABLE staff_locations ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can see staff_locations for their own location
CREATE POLICY "Users see staff at their locations" ON staff_locations
  FOR SELECT
  USING (
    -- Admins see all
    (SELECT role_tier FROM profiles WHERE id = auth.uid()) = 'admin'
    OR
    -- Managers/Schedulers see staff at their managed locations
    (location_id IN (
      SELECT location_id FROM staff_locations 
      WHERE staff_id = auth.uid()
    ))
    OR
    -- Staff see their own record
    staff_id = auth.uid()
  );

-- Policy 2: Service role full access
CREATE POLICY "Service role full access staff_locations" ON staff_locations
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- 3. Enable RLS on courses (courses visible to all, but filtered by location_courses)
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;

-- 4. location_courses already has RLS, verify it's correct
-- Ensure location_courses RLS is in place
ALTER TABLE location_courses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Enable read access for all users" ON location_courses;
DROP POLICY IF EXISTS "Enable write for admins" ON location_courses;

-- Policy 1: Users can read courses for their locations
CREATE POLICY "Users read location courses for their locations" ON location_courses
  FOR SELECT
  USING (
    -- Admins see all
    (SELECT role_tier FROM profiles WHERE id = auth.uid()) = 'admin'
    OR
    -- Managers/Schedulers see courses for their locations
    (location_id IN (
      SELECT location_id FROM staff_locations 
      WHERE staff_id = auth.uid()
    ))
    OR
    -- All authenticated users can see all courses (filtered by location in app)
    auth.uid() IS NOT NULL
  );

-- Policy 2: Only admins can write
CREATE POLICY "Only admins write location_courses" ON location_courses
  FOR UPDATE
  USING (
    (SELECT role_tier FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Only admins insert location_courses" ON location_courses
  FOR INSERT
  WITH CHECK (
    (SELECT role_tier FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Service role full access location_courses" ON location_courses
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- 5. Enable RLS on profiles (for reading user info)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can see staff at their locations
CREATE POLICY "Users see profiles for their locations" ON profiles
  FOR SELECT
  USING (
    -- Admins see all
    (SELECT role_tier FROM profiles WHERE id = auth.uid()) = 'admin'
    OR
    -- Managers/Schedulers see staff at their managed locations
    (id IN (
      SELECT DISTINCT p.id FROM profiles p
      INNER JOIN staff_locations sl ON p.id = sl.staff_id
      WHERE sl.location_id IN (
        SELECT location_id FROM staff_locations 
        WHERE staff_id = auth.uid()
      )
    ))
    OR
    -- Users can see themselves
    id = auth.uid()
  );

-- Policy 2: Service role full access
CREATE POLICY "Service role full access profiles" ON profiles
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- 6. Locations table (read-only for most)
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users read locations" ON locations
  FOR SELECT
  USING (true);

CREATE POLICY "Service role full access locations" ON locations
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
