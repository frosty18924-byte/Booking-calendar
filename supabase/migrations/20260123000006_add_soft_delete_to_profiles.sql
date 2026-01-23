-- Add soft delete columns to profiles table for historical analytics
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create index for faster queries filtering deleted users
CREATE INDEX IF NOT EXISTS idx_profiles_is_deleted ON profiles(is_deleted);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at);

-- Comment explaining the soft delete
COMMENT ON COLUMN profiles.is_deleted IS 'Soft delete flag - TRUE means user is deleted but record kept for analytics';
COMMENT ON COLUMN profiles.deleted_at IS 'Timestamp when user was deleted';
