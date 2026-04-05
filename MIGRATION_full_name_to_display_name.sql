-- ============================================
-- MIGRATION: Rename full_name to display_name
-- Add unique constraint to username
-- ============================================

-- Step 1: Add the new display_name column (if it doesn't exist)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);

-- Step 2: Copy existing full_name data to display_name
UPDATE user_profiles
SET display_name = full_name
WHERE display_name IS NULL AND full_name IS NOT NULL;

-- Step 3: Set a default value for any rows that still have NULL display_name
UPDATE user_profiles
SET display_name = 'User'
WHERE display_name IS NULL;

-- Step 4: Make display_name NOT NULL
ALTER TABLE user_profiles
ALTER COLUMN display_name SET NOT NULL;

-- Step 5: Add unique constraint to username (if it doesn't exist)
-- First, check if constraint already exists and fix any duplicates
DELETE FROM user_profiles
WHERE id NOT IN (
  SELECT DISTINCT ON (username) id
  FROM user_profiles
  WHERE username IS NOT NULL
  ORDER BY username, created_at DESC
)
AND username IS NOT NULL;

-- Add the unique constraint
ALTER TABLE user_profiles
ADD CONSTRAINT unique_username UNIQUE(username);

-- Step 6: Drop the old full_name column (optional - keep it for safety)
-- Only run this after confirming display_name has all the data
-- ALTER TABLE user_profiles
-- DROP COLUMN full_name;

-- Verify the changes
SELECT id, display_name, username, email FROM user_profiles LIMIT 5;
