-- Fix RLS for booking checklist tables used by the calendar roster checklist modal
-- Allows schedulers/admins to read and manage checklist state, while keeping service role access.

ALTER TABLE booking_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Schedulers and admins read booking_checklists" ON booking_checklists;
CREATE POLICY "Schedulers and admins read booking_checklists" ON booking_checklists
  FOR SELECT
  USING (
    (SELECT role_tier FROM profiles WHERE id = auth.uid()) IN ('scheduler', 'admin')
  );

DROP POLICY IF EXISTS "Schedulers and admins write booking_checklists" ON booking_checklists;
CREATE POLICY "Schedulers and admins write booking_checklists" ON booking_checklists
  FOR ALL
  USING (
    (SELECT role_tier FROM profiles WHERE id = auth.uid()) IN ('scheduler', 'admin')
  )
  WITH CHECK (
    (SELECT role_tier FROM profiles WHERE id = auth.uid()) IN ('scheduler', 'admin')
  );

DROP POLICY IF EXISTS "Service role full access booking_checklists" ON booking_checklists;
CREATE POLICY "Service role full access booking_checklists" ON booking_checklists
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Schedulers and admins read checklist_completions" ON checklist_completions;
CREATE POLICY "Schedulers and admins read checklist_completions" ON checklist_completions
  FOR SELECT
  USING (
    (SELECT role_tier FROM profiles WHERE id = auth.uid()) IN ('scheduler', 'admin')
  );

DROP POLICY IF EXISTS "Schedulers and admins write checklist_completions" ON checklist_completions;
CREATE POLICY "Schedulers and admins write checklist_completions" ON checklist_completions
  FOR ALL
  USING (
    (SELECT role_tier FROM profiles WHERE id = auth.uid()) IN ('scheduler', 'admin')
  )
  WITH CHECK (
    (SELECT role_tier FROM profiles WHERE id = auth.uid()) IN ('scheduler', 'admin')
  );

DROP POLICY IF EXISTS "Service role full access checklist_completions" ON checklist_completions;
CREATE POLICY "Service role full access checklist_completions" ON checklist_completions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');
