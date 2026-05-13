-- Persistent per-user notifications for IT referrals.

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  referral_id uuid NULL REFERENCES public.it_referrals(id) ON DELETE CASCADE,
  ticket_update_id uuid NULL REFERENCES public.ticket_updates(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  read_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
  ON public.notifications (recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_recipient_unread_idx
  ON public.notifications (recipient_user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications"
  ON public.notifications
  FOR SELECT
  USING (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users delete own notifications"
  ON public.notifications
  FOR DELETE
  USING (recipient_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_new_it_referral(p_referral_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referral_row public.it_referrals%ROWTYPE;
  admin_profile RECORD;
BEGIN
  SELECT *
  INTO referral_row
  FROM public.it_referrals
  WHERE id = p_referral_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  FOR admin_profile IN
    SELECT id
    FROM public.profiles
    WHERE role_tier = 'admin'
  LOOP
    INSERT INTO public.notifications (
      recipient_user_id,
      type,
      referral_id,
      title,
      body
    )
    VALUES (
      admin_profile.id,
      'it_referral_created',
      referral_row.id,
      'New ticket #' || COALESCE(referral_row.ticket_number::text, '—'),
      referral_row.issue_title
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_it_referral_update(
  p_referral_id uuid,
  p_ticket_update_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referral_row public.it_referrals%ROWTYPE;
  update_row public.ticket_updates%ROWTYPE;
  admin_profile RECORD;
BEGIN
  SELECT *
  INTO referral_row
  FROM public.it_referrals
  WHERE id = p_referral_id;

  SELECT *
  INTO update_row
  FROM public.ticket_updates
  WHERE id = p_ticket_update_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF referral_row.id IS NULL THEN
    RETURN;
  END IF;

  FOR admin_profile IN
    SELECT id
    FROM public.profiles
    WHERE role_tier = 'admin'
      AND (update_row.author_user_id IS NULL OR id <> update_row.author_user_id)
  LOOP
    INSERT INTO public.notifications (
      recipient_user_id,
      type,
      referral_id,
      ticket_update_id,
      title,
      body
    )
    VALUES (
      admin_profile.id,
      CASE WHEN update_row.is_internal THEN 'it_referral_internal_update' ELSE 'it_referral_update' END,
      referral_row.id,
      update_row.id,
      'Ticket #' || COALESCE(referral_row.ticket_number::text, '—') || ' updated',
      update_row.update_text
    );
  END LOOP;

  IF referral_row.requester_user_id IS NOT NULL
     AND referral_row.requester_user_id IS DISTINCT FROM update_row.author_user_id
     AND update_row.is_internal = false THEN
    INSERT INTO public.notifications (
      recipient_user_id,
      type,
      referral_id,
      ticket_update_id,
      title,
      body
    )
    VALUES (
      referral_row.requester_user_id,
      'it_referral_update',
      referral_row.id,
      update_row.id,
      'Update on ticket #' || COALESCE(referral_row.ticket_number::text, '—'),
      update_row.update_text
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_new_it_referral(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_it_referral_update(uuid, uuid) TO authenticated;
