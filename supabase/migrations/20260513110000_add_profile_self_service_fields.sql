-- Add self-service profile fields and profile photo storage.
-- Safe to run across environments.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    EXECUTE 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text';
    EXECUTE 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_path text';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'buckets'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'objects'
  ) THEN
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'profile-photos') THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('profile-photos', 'profile-photos', true);
      END IF;

      EXECUTE 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY';

      EXECUTE 'DROP POLICY IF EXISTS "App authenticated read profile photos bucket" ON storage.objects';
      EXECUTE 'CREATE POLICY "App authenticated read profile photos bucket" ON storage.objects FOR SELECT USING (bucket_id = ''profile-photos'' AND auth.uid() IS NOT NULL)';

      EXECUTE 'DROP POLICY IF EXISTS "Users manage their own profile photos bucket" ON storage.objects';
      EXECUTE $policy$
        CREATE POLICY "Users manage their own profile photos bucket"
        ON storage.objects
        FOR ALL
        USING (
          bucket_id = 'profile-photos'
          AND auth.uid() IS NOT NULL
          AND (storage.foldername(name))[1] = auth.uid()::text
        )
        WITH CHECK (
          bucket_id = 'profile-photos'
          AND auth.uid() IS NOT NULL
          AND (storage.foldername(name))[1] = auth.uid()::text
        )
      $policy$;
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'Skipping Storage policies for bucket=profile-photos (insufficient privilege to modify storage.objects). Create bucket/policies via Supabase Dashboard Storage UI or run this migration as the storage table owner.';
    END;
  END IF;
END
$$;
