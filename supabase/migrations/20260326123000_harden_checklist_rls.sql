-- Harden checklist-related tables with explicit RLS policies.
-- These tables were originally created with RLS disabled; this migration enables RLS and applies least-privilege access.

DO $$
BEGIN
  -- booking_checklist_template_items: authenticated read, admin write
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'booking_checklist_template_items'
  ) THEN
    EXECUTE 'ALTER TABLE public.booking_checklist_template_items ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "App authenticated read booking_checklist_template_items" ON public.booking_checklist_template_items';
    EXECUTE 'CREATE POLICY "App authenticated read booking_checklist_template_items" ON public.booking_checklist_template_items FOR SELECT USING (auth.uid() IS NOT NULL)';

    EXECUTE 'DROP POLICY IF EXISTS "App admin write booking_checklist_template_items" ON public.booking_checklist_template_items';
    EXECUTE 'CREATE POLICY "App admin write booking_checklist_template_items" ON public.booking_checklist_template_items FOR ALL USING (public.current_user_role_tier() = ''admin'') WITH CHECK (public.current_user_role_tier() = ''admin'')';
  END IF;

  -- booking_checklists: scheduler/admin read+write
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'booking_checklists'
  ) THEN
    EXECUTE 'ALTER TABLE public.booking_checklists ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "App scheduler admin read booking_checklists" ON public.booking_checklists';
    EXECUTE 'CREATE POLICY "App scheduler admin read booking_checklists" ON public.booking_checklists FOR SELECT USING (public.current_user_role_tier() IN (''scheduler'', ''admin''))';

    EXECUTE 'DROP POLICY IF EXISTS "App scheduler admin write booking_checklists" ON public.booking_checklists';
    EXECUTE 'CREATE POLICY "App scheduler admin write booking_checklists" ON public.booking_checklists FOR ALL USING (public.current_user_role_tier() IN (''scheduler'', ''admin'')) WITH CHECK (public.current_user_role_tier() IN (''scheduler'', ''admin''))';
  END IF;

  -- checklist_completions: scheduler/admin read+write
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'checklist_completions'
  ) THEN
    EXECUTE 'ALTER TABLE public.checklist_completions ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "App scheduler admin read checklist_completions" ON public.checklist_completions';
    EXECUTE 'CREATE POLICY "App scheduler admin read checklist_completions" ON public.checklist_completions FOR SELECT USING (public.current_user_role_tier() IN (''scheduler'', ''admin''))';

    EXECUTE 'DROP POLICY IF EXISTS "App scheduler admin write checklist_completions" ON public.checklist_completions';
    EXECUTE 'CREATE POLICY "App scheduler admin write checklist_completions" ON public.checklist_completions FOR ALL USING (public.current_user_role_tier() IN (''scheduler'', ''admin'')) WITH CHECK (public.current_user_role_tier() IN (''scheduler'', ''admin''))';
  END IF;
END
$$;

