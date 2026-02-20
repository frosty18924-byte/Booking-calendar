-- Create email_logs table to audit outbound email activity.

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  test_mode BOOLEAN NOT NULL DEFAULT false,
  provider TEXT,
  message_id TEXT,
  error_text TEXT,
  original_recipients TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  delivered_recipients TEXT[] NOT NULL DEFAULT '{}'::TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs (status);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "App scheduler admin read email_logs" ON public.email_logs;
CREATE POLICY "App scheduler admin read email_logs"
ON public.email_logs
FOR SELECT
USING (
  (SELECT role_tier FROM public.profiles WHERE id = auth.uid()) IN ('scheduler', 'admin')
);

DROP POLICY IF EXISTS "Service role insert email_logs" ON public.email_logs;
CREATE POLICY "Service role insert email_logs"
ON public.email_logs
FOR INSERT
WITH CHECK (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role read email_logs" ON public.email_logs;
CREATE POLICY "Service role read email_logs"
ON public.email_logs
FOR SELECT
USING (auth.jwt()->>'role' = 'service_role');
