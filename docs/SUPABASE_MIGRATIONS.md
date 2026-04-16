# Supabase Migrations

Run these in your **Supabase SQL Editor** to keep your database schema up to date with the app.

---

## 2026-04 — Add avatar emoji + email radar + username lookup

```sql
-- Add new columns to profiles for emoji avatar and email opt-in
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_emoji TEXT,
  ADD COLUMN IF NOT EXISTS email_radar BOOLEAN DEFAULT false;

-- Make username searchable case-insensitively
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON profiles (LOWER(username))
  WHERE username IS NOT NULL;

-- Allow anyone to SELECT a public profile by username
-- (This overrides the RLS policy we disabled earlier.)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies to recreate cleanly
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- New policies
CREATE POLICY "Anyone can read public profiles"
  ON profiles FOR SELECT
  USING (is_public = true OR auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

After running, the app supports:
- Emoji avatars (stored as a single character in `avatar_emoji`)
- Weekly radar email opt-in (`email_radar`)
- `/u/:username` lookups that work across devices — anyone can view a public profile by its username
