-- Add requester scoping and shared conversation support for IT referrals.

ALTER TABLE public.it_referrals
  ADD COLUMN IF NOT EXISTS requester_user_id uuid NULL;

UPDATE public.it_referrals ir
SET requester_user_id = p.id
FROM public.profiles p
WHERE ir.requester_user_id IS NULL
  AND p.email IS NOT NULL
  AND lower(p.email) = lower(ir.email);

ALTER TABLE public.it_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated insert it_referrals" ON public.it_referrals;
CREATE POLICY "Authenticated insert it_referrals"
  ON public.it_referrals
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      public.current_user_role_tier() = 'admin'
      OR requester_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin read it_referrals" ON public.it_referrals;
DROP POLICY IF EXISTS "Scoped read it_referrals" ON public.it_referrals;
CREATE POLICY "Scoped read it_referrals"
  ON public.it_referrals
  FOR SELECT
  USING (
    public.current_user_role_tier() = 'admin'
    OR requester_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Admin update it_referrals" ON public.it_referrals;
CREATE POLICY "Admin update it_referrals"
  ON public.it_referrals
  FOR UPDATE
  USING (public.current_user_role_tier() = 'admin')
  WITH CHECK (public.current_user_role_tier() = 'admin');

CREATE TABLE IF NOT EXISTS public.ticket_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.it_referrals(id) ON DELETE CASCADE,
  update_text text NOT NULL,
  updated_by text NOT NULL,
  author_user_id uuid NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.ticket_updates
  ADD COLUMN IF NOT EXISTS author_user_id uuid NULL,
  ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT timezone('utc', now());

ALTER TABLE public.ticket_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read ticket_updates" ON public.ticket_updates;
DROP POLICY IF EXISTS "Scoped read ticket_updates" ON public.ticket_updates;
CREATE POLICY "Scoped read ticket_updates"
  ON public.ticket_updates
  FOR SELECT
  USING (
    public.current_user_role_tier() = 'admin'
    OR (
      is_internal = false
      AND EXISTS (
        SELECT 1
        FROM public.it_referrals ir
        WHERE ir.id = ticket_updates.referral_id
          AND ir.requester_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Scoped insert ticket_updates" ON public.ticket_updates;
CREATE POLICY "Scoped insert ticket_updates"
  ON public.ticket_updates
  FOR INSERT
  WITH CHECK (
    (
      public.current_user_role_tier() = 'admin'
      AND auth.uid() IS NOT NULL
    )
    OR (
      auth.uid() IS NOT NULL
      AND author_user_id = auth.uid()
      AND is_internal = false
      AND EXISTS (
        SELECT 1
        FROM public.it_referrals ir
        WHERE ir.id = ticket_updates.referral_id
          AND ir.requester_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Admin update ticket_updates" ON public.ticket_updates;
CREATE POLICY "Admin update ticket_updates"
  ON public.ticket_updates
  FOR UPDATE
  USING (public.current_user_role_tier() = 'admin')
  WITH CHECK (public.current_user_role_tier() = 'admin');

DROP POLICY IF EXISTS "Admin delete ticket_updates" ON public.ticket_updates;
CREATE POLICY "Admin delete ticket_updates"
  ON public.ticket_updates
  FOR DELETE
  USING (public.current_user_role_tier() = 'admin');
