-- Ensure it_referrals supports categories + sub categories used by the app.
ALTER TABLE public.it_referrals
  ADD COLUMN IF NOT EXISTS category text NULL,
  ADD COLUMN IF NOT EXISTS sub_category text NULL;

-- Optional columns used by the dashboard (safe if they already exist).
ALTER TABLE public.it_referrals
  ADD COLUMN IF NOT EXISTS assigned_to text NULL,
  ADD COLUMN IF NOT EXISTS priority text NULL,
  ADD COLUMN IF NOT EXISTS status text NULL;

-- RLS (safe to run even if already enabled/policies already exist)
ALTER TABLE public.it_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated insert it_referrals" ON public.it_referrals;
CREATE POLICY "Authenticated insert it_referrals"
  ON public.it_referrals
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin read it_referrals" ON public.it_referrals;
CREATE POLICY "Admin read it_referrals"
  ON public.it_referrals
  FOR SELECT
  USING (public.current_user_role_tier() = 'admin');

DROP POLICY IF EXISTS "Admin update it_referrals" ON public.it_referrals;
CREATE POLICY "Admin update it_referrals"
  ON public.it_referrals
  FOR UPDATE
  USING (public.current_user_role_tier() = 'admin')
  WITH CHECK (public.current_user_role_tier() = 'admin');

