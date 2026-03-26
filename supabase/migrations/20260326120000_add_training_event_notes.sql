-- Add per-event notes to show during booking
ALTER TABLE public.training_events
ADD COLUMN IF NOT EXISTS notes TEXT;
