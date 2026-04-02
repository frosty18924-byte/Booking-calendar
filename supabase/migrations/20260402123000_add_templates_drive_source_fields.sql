-- Optional metadata to support bulk import/sync from Google Drive.
-- Safe across environments.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'templates') THEN
    EXECUTE 'ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS source_drive_file_id text';
    EXECUTE 'ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS source_drive_url text';
    EXECUTE 'ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS source_drive_modified_at timestamptz';
    EXECUTE 'ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS source_drive_mime_type text';
    EXECUTE 'ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS source_drive_name text';

    -- Idempotent uniqueness for sync. Allow nulls.
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS templates_source_drive_file_id_uidx ON public.templates (source_drive_file_id) WHERE source_drive_file_id IS NOT NULL';
  END IF;
END
$$;

