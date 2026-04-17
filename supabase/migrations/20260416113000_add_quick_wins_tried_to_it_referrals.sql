ALTER TABLE public.it_referrals
  ADD COLUMN IF NOT EXISTS quick_wins_tried text[] NULL;

