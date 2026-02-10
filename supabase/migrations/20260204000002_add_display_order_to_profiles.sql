-- Add display_order column to profiles table for CSV sequence ordering
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_profiles_display_order ON public.profiles(display_order);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
