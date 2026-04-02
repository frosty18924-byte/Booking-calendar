-- Templates gallery: metadata table + storage bucket policies.
-- Safe to run across environments (conditional create/alter).

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  -- Create/extend templates table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'templates') THEN
    EXECUTE $ct$
      CREATE TABLE public.templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        name text NOT NULL,
        description text,
        category text,
        tags text[],
        file_path text,
        file_name text,
        file_type text,
        file_size bigint,
        is_active boolean NOT NULL DEFAULT true
      )
    $ct$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'templates') THEN
    EXECUTE 'ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()';
    EXECUTE 'ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()';
    EXECUTE 'ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS name text';
    EXECUTE 'ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS description text';
    EXECUTE 'ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS category text';
    EXECUTE 'ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS tags text[]';
    EXECUTE 'ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS file_path text';
    EXECUTE 'ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS file_name text';
    EXECUTE 'ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS file_type text';
    EXECUTE 'ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS file_size bigint';
    EXECUTE 'ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true';

    -- Backfill required name if someone created table without constraints.
    EXECUTE 'UPDATE public.templates SET name = COALESCE(NULLIF(name, ''''), ''Untitled'') WHERE name IS NULL OR name = ''''';
    EXECUTE 'ALTER TABLE public.templates ALTER COLUMN name SET NOT NULL';

    -- Updated-at trigger
    EXECUTE 'DROP TRIGGER IF EXISTS templates_touch_updated_at ON public.templates';
    EXECUTE 'CREATE TRIGGER templates_touch_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()';

    -- RLS
    EXECUTE 'ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "App authenticated read templates" ON public.templates';
    EXECUTE 'CREATE POLICY "App authenticated read templates" ON public.templates FOR SELECT USING (auth.uid() IS NOT NULL AND (is_active = true OR public.current_user_role_tier() = ''admin''))';
    EXECUTE 'DROP POLICY IF EXISTS "App admin write templates" ON public.templates';
    EXECUTE 'CREATE POLICY "App admin write templates" ON public.templates FOR ALL USING (public.current_user_role_tier() = ''admin'') WITH CHECK (public.current_user_role_tier() = ''admin'')';

    -- Helpful indexes
    EXECUTE 'CREATE INDEX IF NOT EXISTS templates_name_idx ON public.templates (name)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS templates_category_idx ON public.templates (category)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS templates_tags_gin_idx ON public.templates USING gin (tags)';
  END IF;

  -- Storage bucket + policies (Supabase storage schema)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') AND
     EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'templates') THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('templates', 'templates', false);
      END IF;

      -- Note: In some environments the current role is not the owner of `storage.objects`,
      -- so altering RLS or creating policies can fail with 42501. Wrap in a safe block.
      EXECUTE 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY';

      EXECUTE 'DROP POLICY IF EXISTS "App authenticated read templates bucket" ON storage.objects';
      EXECUTE 'CREATE POLICY "App authenticated read templates bucket" ON storage.objects FOR SELECT USING (bucket_id = ''templates'' AND auth.uid() IS NOT NULL)';

      EXECUTE 'DROP POLICY IF EXISTS "App admin write templates bucket" ON storage.objects';
      EXECUTE 'CREATE POLICY "App admin write templates bucket" ON storage.objects FOR ALL USING (bucket_id = ''templates'' AND public.current_user_role_tier() = ''admin'') WITH CHECK (bucket_id = ''templates'' AND public.current_user_role_tier() = ''admin'')';
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'Skipping Storage policies for bucket=templates (insufficient privilege to modify storage.objects). Create bucket/policies via Supabase Dashboard Storage UI or run this migration as the storage table owner.';
    END;
  END IF;
END
$$;
