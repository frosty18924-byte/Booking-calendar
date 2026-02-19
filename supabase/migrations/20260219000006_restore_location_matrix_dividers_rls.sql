-- Restore visibility/access for training matrix divider rows under RLS.
-- Some environments have this table but not tracked schema migration history.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'location_matrix_dividers'
  ) THEN
    EXECUTE 'ALTER TABLE location_matrix_dividers ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can read location_matrix_dividers" ON location_matrix_dividers';
    EXECUTE '
      CREATE POLICY "Authenticated users can read location_matrix_dividers" ON location_matrix_dividers
      FOR SELECT
      USING (auth.uid() IS NOT NULL)
    ';

    EXECUTE 'DROP POLICY IF EXISTS "Schedulers/admins can write location_matrix_dividers" ON location_matrix_dividers';
    EXECUTE '
      CREATE POLICY "Schedulers/admins can write location_matrix_dividers" ON location_matrix_dividers
      FOR ALL
      USING ((SELECT role_tier FROM profiles WHERE id = auth.uid()) IN (''scheduler'', ''admin''))
      WITH CHECK ((SELECT role_tier FROM profiles WHERE id = auth.uid()) IN (''scheduler'', ''admin''))
    ';

    EXECUTE 'DROP POLICY IF EXISTS "Service role full access location_matrix_dividers" ON location_matrix_dividers';
    EXECUTE '
      CREATE POLICY "Service role full access location_matrix_dividers" ON location_matrix_dividers
      FOR ALL
      USING (auth.jwt()->>''role'' = ''service_role'')
      WITH CHECK (auth.jwt()->>''role'' = ''service_role'')
    ';
  END IF;
END
$$;
