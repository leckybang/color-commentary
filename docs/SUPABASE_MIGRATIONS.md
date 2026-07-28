# Supabase Migrations

Run these in your **Supabase SQL Editor** to keep your database schema up to date with the app.

---

## 2026-07 — Half-star ratings + vibe tags ✅ APPLIED

> Applied to the live project as migration `half_star_ratings_and_vibe_tags` on 2026-07-28.
>
> Both changes are backward compatible, so the DB could go first: existing
> integer ratings are all valid `numeric(2,1)` values, and the old client
> (which only writes whole numbers and never reads `vibe_tags`) keeps working
> against the new schema.

```sql
-- Ratings move from whole stars to halves. numeric(2,1) holds 0.0–5.0 and the
-- constraint mirrors normalizeRating() in src/utils/ratingUtils.js: in range,
-- and landing on a half step.
ALTER TABLE public.catalog_items
  ALTER COLUMN rating TYPE numeric(2,1) USING rating::numeric(2,1);

ALTER TABLE public.catalog_items
  DROP CONSTRAINT IF EXISTS catalog_items_rating_half_step;

ALTER TABLE public.catalog_items
  ADD CONSTRAINT catalog_items_rating_half_step
  CHECK (rating >= 0 AND rating <= 5 AND (rating * 2) = floor(rating * 2));

-- Vibe tags: why you consumed it, beyond artistic quality. The vocabulary is
-- fixed in src/data/vibeTags.js and enforced client-side (sanitizeVibeTags
-- drops anything unrecognized on both read and write), so the column stays a
-- plain text array. The GIN index is for filtering by tag.
ALTER TABLE public.catalog_items
  ADD COLUMN IF NOT EXISTS vibe_tags text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS catalog_items_vibe_tags_idx
  ON public.catalog_items USING GIN (vibe_tags);
```

---

## 2026-07 — Friend-of-friend discovery ✅ APPLIED

> Applied as migration `public_following_lists_readable` on 2026-07-10.

```sql
-- Who a PUBLIC profile follows is visible. Uses a SECURITY DEFINER helper so
-- the follows policy can consult profiles without recursing back into the
-- profiles policy (which itself consults follows).
CREATE OR REPLACE FUNCTION public.is_public_profile(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT COALESCE((SELECT is_public FROM profiles WHERE id = uid), false) $$;

REVOKE ALL ON FUNCTION public.is_public_profile(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_public_profile(uuid) TO anon, authenticated;

CREATE POLICY "Following lists of public profiles are readable"
  ON follows FOR SELECT
  USING (public.is_public_profile(follower_id));
```

---

## 2026-07 — Friends: missing profile columns + tightened read policies ✅ APPLIED

> Applied directly to the live project as migration `friends_profile_settings_and_policies` on 2026-07-10. Kept here for reference.

```sql
-- Profile settings the app writes but the table never had (their absence made
-- every profile upsert fail, so username/bio/emoji/is_public never synced).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_emoji TEXT,
  ADD COLUMN IF NOT EXISTS email_radar BOOLEAN DEFAULT false;

-- Case-insensitive unique usernames; also speeds up /u/:username lookups.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON profiles (LOWER(username))
  WHERE username IS NOT NULL;

-- Tighten profile reads. Previously USING (true): every profile (and email)
-- was readable by anyone with the anon key. Now: public profiles, your own,
-- or someone you're in a follow relationship with.
DROP POLICY IF EXISTS "Profiles publicly readable" ON profiles;
DROP POLICY IF EXISTS "Anyone can read public profiles" ON profiles;
CREATE POLICY "Public, own, or followed profiles readable"
  ON profiles FOR SELECT
  USING (
    is_public = true
    OR id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM follows
      WHERE (follows.follower_id = auth.uid() AND follows.following_id = profiles.id)
         OR (follows.following_id = auth.uid() AND follows.follower_id = profiles.id)
    )
  );

-- The follow graph doesn't need to be world-readable; the app only ever reads
-- your own edges (as follower or followee), which the remaining policies cover.
DROP POLICY IF EXISTS "Follows publicly readable" ON follows;
```

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

---

## 2026-04 — Next Up (Top 3 prioritized Want to Try)

Run this so the new "Next Up" section on the Catalog page can sync your pinned/reordered top 3 items across devices:

```sql
CREATE TABLE IF NOT EXISTS next_up_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  catalog_item_id UUID REFERENCES catalog_items(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, catalog_item_id)
);

ALTER TABLE next_up_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own next_up"
  ON next_up_items FOR ALL
  USING (auth.uid() = user_id);
```

This mirrors the `heavy_rotation_items` table — a simple ordered list of catalog item IDs with the user's custom priority order. The `ON DELETE CASCADE` means if you delete a catalog item, it's automatically removed from Next Up.

## Friend profile view — read catalogs of public profiles

Run this so that when a user makes their profile public, **catalog reads** are also allowed (everything else stays owner-only). Taste profiles, weekly dumps, and scratchpad notes remain private regardless of the public-profile flag — only the catalog items become visible, and only when `is_public = true`.

```sql
-- Permit reading another user's catalog_items when their profile is public.
-- Owner can still always manage their own (the existing FOR ALL policy).
CREATE POLICY "Anyone can read catalog of public profiles"
  ON catalog_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = catalog_items.user_id
        AND profiles.is_public = true
    )
  );
```

Without this policy, a follower viewing `/u/<username>` will see only the basics (name, avatar, bio) — the Current Favorites / Right Now / Stats sections will be empty because the client can't read the friend's catalog. Run the policy once and the friend view fills in.

## Security tidy (applied 2026-07-11 via MCP, migration `security_tidy_dedupe_policies_lock_rls_helper`)

Already applied to prod. Locks down the internal RLS helper and removes Firebase-era duplicate policies:

```sql
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Users manage own catalog" ON public.catalog_items;
DROP POLICY IF EXISTS "Users manage own heavy rotation" ON public.heavy_rotation_items;
DROP POLICY IF EXISTS "Users manage own next-up list" ON public.next_up_items;
DROP POLICY IF EXISTS "Users manage own scratchpad notes" ON public.scratchpad_notes;
DROP POLICY IF EXISTS "Users manage own taste profile" ON public.taste_profiles;
DROP POLICY IF EXISTS "Users manage own weekly dumps" ON public.weekly_dumps;
```

Each table keeps its uuid-native `"Users can manage own …"` policy; behavior is unchanged. `is_public_profile()` intentionally stays executable — RLS policies evaluate it as the querying role. Remaining manual step: enable leaked-password protection in Dashboard → Authentication.

## Popular with Users (applied 2026-07-11 via MCP, migration `popular_items_aggregate_rpc`)

Already applied to prod. Anonymous aggregate powering the dashboard "Popular with Users" widget — counts only, no user attribution, signed-in callers only:

```sql
CREATE OR REPLACE FUNCTION public.popular_items(
  days_back int DEFAULT 14,
  min_users int DEFAULT 2,
  max_rows int DEFAULT 6
)
RETURNS TABLE (title text, creator text, item_type text, cover_url text, user_count bigint, latest_added timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT MAX(c.title), MAX(c.creator) FILTER (WHERE c.creator IS NOT NULL AND c.creator <> ''),
         c.type, MAX(c.cover_url) FILTER (WHERE c.cover_url IS NOT NULL AND c.cover_url <> ''),
         COUNT(DISTINCT c.user_id), MAX(c.created_at)
  FROM public.catalog_items c
  WHERE c.created_at > now() - make_interval(days => LEAST(GREATEST(days_back, 1), 90))
  GROUP BY lower(trim(c.title)), c.type
  HAVING COUNT(DISTINCT c.user_id) >= GREATEST(min_users, 2)
  ORDER BY COUNT(DISTINCT c.user_id) DESC, MAX(c.created_at) DESC
  LIMIT LEAST(GREATEST(max_rows, 1), 12);
$$;

REVOKE ALL ON FUNCTION public.popular_items(int, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.popular_items(int, int, int) TO authenticated;
```
## Feed reactions (applied 2026-07-11 via MCP, migration `item_reactions_table`)

Already applied to prod. Emoji reactions on catalog items, powering the friends-feed reaction bar and the Friends nav dot:

```sql
CREATE TABLE public.item_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  reactor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (char_length(emoji) <= 8),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, reactor_id, emoji)
);
CREATE INDEX item_reactions_item_idx ON public.item_reactions (item_id);
CREATE INDEX item_reactions_created_idx ON public.item_reactions (created_at DESC);
ALTER TABLE public.item_reactions ENABLE ROW LEVEL SECURITY;
-- Policies: insert only as yourself and only on items you can see (own or
-- public-profile items); select where the item is visible to you; delete own.
```

RLS verified with simulated JWTs: a user can react to a public profile's item, and an attempt to insert a reaction with someone else's reactor_id is rejected by the WITH CHECK.

## Username availability (applied 2026-07-12 via MCP, migration `username_taken_rpc`)

Already applied to prod. Availability check for the onboarding "Claim your corner" step. SECURITY DEFINER because RLS hides private profiles from a plain select, which would falsely report a taken username as available. Returns only a boolean; signed-in callers only:

```sql
CREATE OR REPLACE FUNCTION public.username_taken(name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE lower(username) = lower(trim(name))
  );
$$;
REVOKE ALL ON FUNCTION public.username_taken(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.username_taken(text) TO authenticated;
```

## Hide from Profile (applied 2026-07-13 via MCP, migration `catalog_items_hidden_flag`)

Already applied to prod. Adds `catalog_items.hidden boolean NOT NULL DEFAULT false` and enforces it server-side: the public-profile read policy, both item_reactions visibility policies, and the popular_items() aggregate all exclude hidden rows. Verified with a simulated JWT: another user reading a public catalog gets zero hidden items.
