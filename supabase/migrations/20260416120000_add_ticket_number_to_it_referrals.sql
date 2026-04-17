-- Human-friendly ticket number (1, 2, 3...) separate from UUID primary key.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S'
      AND c.relname = 'it_referrals_ticket_number_seq'
      AND n.nspname = 'public'
  ) THEN
    CREATE SEQUENCE public.it_referrals_ticket_number_seq;
  END IF;
END $$;

ALTER TABLE public.it_referrals
  ADD COLUMN IF NOT EXISTS ticket_number bigint;

ALTER TABLE public.it_referrals
  ALTER COLUMN ticket_number SET DEFAULT nextval('public.it_referrals_ticket_number_seq');

-- Backfill any missing ticket numbers.
UPDATE public.it_referrals
SET ticket_number = nextval('public.it_referrals_ticket_number_seq')
WHERE ticket_number IS NULL;

-- Ensure the sequence continues from the max ticket number.
SELECT setval(
  'public.it_referrals_ticket_number_seq',
  GREATEST((SELECT COALESCE(MAX(ticket_number), 0) FROM public.it_referrals), 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS it_referrals_ticket_number_unique
  ON public.it_referrals (ticket_number);

