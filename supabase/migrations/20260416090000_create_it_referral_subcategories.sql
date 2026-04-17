CREATE TABLE IF NOT EXISTS public.it_referral_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL DEFAULT auth.uid()
);

CREATE UNIQUE INDEX IF NOT EXISTS it_referral_subcategories_category_label_unique
  ON public.it_referral_subcategories (category, lower(label));

ALTER TABLE public.it_referral_subcategories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read it_referral_subcategories" ON public.it_referral_subcategories;
CREATE POLICY "Authenticated read it_referral_subcategories"
  ON public.it_referral_subcategories
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins manage it_referral_subcategories" ON public.it_referral_subcategories;
CREATE POLICY "Admins manage it_referral_subcategories"
  ON public.it_referral_subcategories
  FOR ALL
  USING (public.current_user_role_tier() = 'admin')
  WITH CHECK (public.current_user_role_tier() = 'admin');

