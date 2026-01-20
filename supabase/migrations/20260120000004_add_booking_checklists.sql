-- Create booking_checklists table
CREATE TABLE booking_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES training_events(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(booking_id, item_name)
);

-- Create checklist_completions table (audit trail)
CREATE TABLE checklist_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES training_events(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES booking_checklists(id) ON DELETE CASCADE,
  completed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_by_name TEXT NOT NULL,
  completed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(booking_id, checklist_item_id)
);

-- Create indexes for faster queries
CREATE INDEX idx_booking_checklists_booking_id ON booking_checklists(booking_id);
CREATE INDEX idx_checklist_completions_booking_id ON checklist_completions(booking_id);
CREATE INDEX idx_checklist_completions_completed_by ON checklist_completions(completed_by);

-- Disable RLS for admin tables (same as locations/venues)
ALTER TABLE booking_checklists DISABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_completions DISABLE ROW LEVEL SECURITY;
