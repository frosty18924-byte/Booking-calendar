-- Restore training matrix visibility after restrictive/recursive RLS changes.
-- This keeps RLS enabled but ensures authenticated app users can read matrix data.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_training_matrix ENABLE ROW LEVEL SECURITY;

-- Remove recursive profile policy (it queried profiles from profiles policy).
DROP POLICY IF EXISTS "Users see profiles for their locations" ON profiles;

DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles;
CREATE POLICY "Authenticated users can read profiles" ON profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Ensure matrix-related tables remain visible to authenticated users.
DROP POLICY IF EXISTS "Authenticated users can read staff_locations" ON staff_locations;
CREATE POLICY "Authenticated users can read staff_locations" ON staff_locations
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can read staff_training_matrix" ON staff_training_matrix;
CREATE POLICY "Authenticated users can read staff_training_matrix" ON staff_training_matrix
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
