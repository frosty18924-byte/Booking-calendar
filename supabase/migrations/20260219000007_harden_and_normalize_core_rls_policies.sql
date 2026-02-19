-- Normalize core RLS policies so enabling RLS does not break app features.
-- Uses conditional table checks to stay safe across environments.

CREATE OR REPLACE FUNCTION public.current_user_role_tier()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role_tier
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1
$$;

DO $$
BEGIN
  -- profiles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    EXECUTE 'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "App authenticated read profiles" ON profiles';
    EXECUTE 'CREATE POLICY "App authenticated read profiles" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL)';
    EXECUTE 'DROP POLICY IF EXISTS "App admin write profiles" ON profiles';
    EXECUTE 'CREATE POLICY "App admin write profiles" ON profiles FOR ALL USING (public.current_user_role_tier() = ''admin'') WITH CHECK (public.current_user_role_tier() = ''admin'')';
  END IF;

  -- staff_locations (drop recursive policy from older migration)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_locations') THEN
    EXECUTE 'ALTER TABLE staff_locations ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users see staff at their locations" ON staff_locations';
    EXECUTE 'DROP POLICY IF EXISTS "App authenticated read staff_locations" ON staff_locations';
    EXECUTE 'CREATE POLICY "App authenticated read staff_locations" ON staff_locations FOR SELECT USING (auth.uid() IS NOT NULL)';
    EXECUTE 'DROP POLICY IF EXISTS "App scheduler admin write staff_locations" ON staff_locations';
    EXECUTE 'CREATE POLICY "App scheduler admin write staff_locations" ON staff_locations FOR ALL USING (public.current_user_role_tier() IN (''scheduler'', ''admin'')) WITH CHECK (public.current_user_role_tier() IN (''scheduler'', ''admin''))';
  END IF;

  -- staff_training_matrix
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_training_matrix') THEN
    EXECUTE 'ALTER TABLE staff_training_matrix ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "App authenticated read staff_training_matrix" ON staff_training_matrix';
    EXECUTE 'CREATE POLICY "App authenticated read staff_training_matrix" ON staff_training_matrix FOR SELECT USING (auth.uid() IS NOT NULL)';
    EXECUTE 'DROP POLICY IF EXISTS "App scheduler admin write staff_training_matrix" ON staff_training_matrix';
    EXECUTE 'CREATE POLICY "App scheduler admin write staff_training_matrix" ON staff_training_matrix FOR ALL USING (public.current_user_role_tier() IN (''scheduler'', ''admin'')) WITH CHECK (public.current_user_role_tier() IN (''scheduler'', ''admin''))';
  END IF;

  -- locations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'locations') THEN
    EXECUTE 'ALTER TABLE locations ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "App authenticated read locations" ON locations';
    EXECUTE 'CREATE POLICY "App authenticated read locations" ON locations FOR SELECT USING (auth.uid() IS NOT NULL)';
    EXECUTE 'DROP POLICY IF EXISTS "App admin write locations" ON locations';
    EXECUTE 'CREATE POLICY "App admin write locations" ON locations FOR ALL USING (public.current_user_role_tier() = ''admin'') WITH CHECK (public.current_user_role_tier() = ''admin'')';
  END IF;

  -- venues
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'venues') THEN
    EXECUTE 'ALTER TABLE venues ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "App authenticated read venues" ON venues';
    EXECUTE 'CREATE POLICY "App authenticated read venues" ON venues FOR SELECT USING (auth.uid() IS NOT NULL)';
    EXECUTE 'DROP POLICY IF EXISTS "App admin write venues" ON venues';
    EXECUTE 'CREATE POLICY "App admin write venues" ON venues FOR ALL USING (public.current_user_role_tier() = ''admin'') WITH CHECK (public.current_user_role_tier() = ''admin'')';
  END IF;

  -- courses
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
    EXECUTE 'ALTER TABLE courses ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "App authenticated read courses" ON courses';
    EXECUTE 'CREATE POLICY "App authenticated read courses" ON courses FOR SELECT USING (auth.uid() IS NOT NULL)';
    EXECUTE 'DROP POLICY IF EXISTS "App admin write courses" ON courses';
    EXECUTE 'CREATE POLICY "App admin write courses" ON courses FOR ALL USING (public.current_user_role_tier() = ''admin'') WITH CHECK (public.current_user_role_tier() = ''admin'')';
  END IF;

  -- training_courses
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_courses') THEN
    EXECUTE 'ALTER TABLE training_courses ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "App authenticated read training_courses" ON training_courses';
    EXECUTE 'CREATE POLICY "App authenticated read training_courses" ON training_courses FOR SELECT USING (auth.uid() IS NOT NULL)';
    EXECUTE 'DROP POLICY IF EXISTS "App admin write training_courses" ON training_courses';
    EXECUTE 'CREATE POLICY "App admin write training_courses" ON training_courses FOR ALL USING (public.current_user_role_tier() = ''admin'') WITH CHECK (public.current_user_role_tier() = ''admin'')';
  END IF;

  -- location_courses
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'location_courses') THEN
    EXECUTE 'ALTER TABLE location_courses ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "App authenticated read location_courses" ON location_courses';
    EXECUTE 'CREATE POLICY "App authenticated read location_courses" ON location_courses FOR SELECT USING (auth.uid() IS NOT NULL)';
    EXECUTE 'DROP POLICY IF EXISTS "App admin write location_courses" ON location_courses';
    EXECUTE 'CREATE POLICY "App admin write location_courses" ON location_courses FOR ALL USING (public.current_user_role_tier() = ''admin'') WITH CHECK (public.current_user_role_tier() = ''admin'')';
  END IF;

  -- location_training_courses
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'location_training_courses') THEN
    EXECUTE 'ALTER TABLE location_training_courses ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "App authenticated read location_training_courses" ON location_training_courses';
    EXECUTE 'CREATE POLICY "App authenticated read location_training_courses" ON location_training_courses FOR SELECT USING (auth.uid() IS NOT NULL)';
    EXECUTE 'DROP POLICY IF EXISTS "App admin write location_training_courses" ON location_training_courses';
    EXECUTE 'CREATE POLICY "App admin write location_training_courses" ON location_training_courses FOR ALL USING (public.current_user_role_tier() = ''admin'') WITH CHECK (public.current_user_role_tier() = ''admin'')';
  END IF;

  -- training_events
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_events') THEN
    EXECUTE 'ALTER TABLE training_events ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "App authenticated read training_events" ON training_events';
    EXECUTE 'CREATE POLICY "App authenticated read training_events" ON training_events FOR SELECT USING (auth.uid() IS NOT NULL)';
    EXECUTE 'DROP POLICY IF EXISTS "App scheduler admin write training_events" ON training_events';
    EXECUTE 'CREATE POLICY "App scheduler admin write training_events" ON training_events FOR ALL USING (public.current_user_role_tier() IN (''scheduler'', ''admin'')) WITH CHECK (public.current_user_role_tier() IN (''scheduler'', ''admin''))';
  END IF;

  -- bookings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    EXECUTE 'ALTER TABLE bookings ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "App authenticated read bookings" ON bookings';
    EXECUTE 'CREATE POLICY "App authenticated read bookings" ON bookings FOR SELECT USING (auth.uid() IS NOT NULL)';
    EXECUTE 'DROP POLICY IF EXISTS "App scheduler admin write bookings" ON bookings';
    EXECUTE 'CREATE POLICY "App scheduler admin write bookings" ON bookings FOR ALL USING (public.current_user_role_tier() IN (''scheduler'', ''admin'')) WITH CHECK (public.current_user_role_tier() IN (''scheduler'', ''admin''))';
  END IF;

  -- course_event_overrides
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_event_overrides') THEN
    EXECUTE 'ALTER TABLE course_event_overrides ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "App authenticated read course_event_overrides" ON course_event_overrides';
    EXECUTE 'CREATE POLICY "App authenticated read course_event_overrides" ON course_event_overrides FOR SELECT USING (auth.uid() IS NOT NULL)';
    EXECUTE 'DROP POLICY IF EXISTS "App scheduler admin write course_event_overrides" ON course_event_overrides';
    EXECUTE 'CREATE POLICY "App scheduler admin write course_event_overrides" ON course_event_overrides FOR ALL USING (public.current_user_role_tier() IN (''scheduler'', ''admin'')) WITH CHECK (public.current_user_role_tier() IN (''scheduler'', ''admin''))';
  END IF;
END
$$;
