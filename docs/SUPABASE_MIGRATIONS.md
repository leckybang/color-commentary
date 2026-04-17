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

---

## 2026-04 — Cross-device data sync for all features

Run this to add the `year` column to `catalog_items` (for API-fetched release years) and make sure the `weekly_dumps` unique constraint is in place:

```sql
-- Catalog items: add year column for API-returned release years
ALTER TABLE catalog_items
  ADD COLUMN IF NOT EXISTS year TEXT;

-- Ensure weekly_dumps has a unique constraint for upserts
DO $$ BEGIN
  ALTER TABLE weekly_dumps ADD CONSTRAINT weekly_dumps_user_week_unique UNIQUE (user_id, week_id);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

-- Taste profiles: one row per user
DO $$ BEGIN
  ALTER TABLE taste_profiles ADD CONSTRAINT taste_profiles_user_unique UNIQUE (user_id);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;
```

After running, the app syncs:
- **Catalog** — individual items with full CRUD
- **Taste profile** — whole profile as JSONB, debounced writes
- **Weekly dumps** — one row per week, upsert on `(user_id, week_id)`
- **Scratchpad notes** — per-row insert/delete
- **Heavy Rotation / Current Favorites** — bulk replace on every change
- **Follows / Friends** — per-row insert/delete, async user search via public profiles
- **Group Chat / Together sessions** — full multi-table sync (sessions + participants + notes)

---

## 2026-04 — Scratchpad notes can capture media metadata

Run this so "Someone Told Me About..." can store the media type, creator, year, and cover URL when the user picks a real match from the search API:

```sql
ALTER TABLE scratchpad_notes
  ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('music', 'movie', 'tv', 'book')),
  ADD COLUMN IF NOT EXISTS creator TEXT,
  ADD COLUMN IF NOT EXISTS year TEXT,
  ADD COLUMN IF NOT EXISTS cover_url TEXT;
```

After running, new scratchpad notes will persist type + cover art across devices. Existing plain-text notes continue to work unchanged.
