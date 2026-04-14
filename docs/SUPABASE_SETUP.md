# Supabase Setup Guide for Color Commentary

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up / log in
2. Click "New Project"
3. Choose a name (e.g., `color-commentary`)
4. Set a database password (save this somewhere safe!)
5. Choose the region closest to your users
6. Click "Create new project"

## 2. Get Your API Keys

1. In your Supabase dashboard, go to **Settings > API**
2. Copy the **Project URL** and **anon/public** key
3. Create a `.env` file in your project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Go to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client ID**
5. Set Application type to **Web application**
6. Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
7. Copy the **Client ID** and **Client Secret**
8. In Supabase dashboard, go to **Authentication > Providers > Google**
9. Enable Google provider
10. Paste in the Client ID and Client Secret
11. Save

## 4. Database Schema

Run this SQL in the Supabase **SQL Editor**:

```sql
-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  archetype TEXT,
  theme_index INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  username TEXT UNIQUE,
  bio TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Catalog items
CREATE TABLE catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  creator TEXT,
  type TEXT NOT NULL CHECK (type IN ('music', 'movie', 'tv', 'book')),
  genre TEXT DEFAULT '',
  status TEXT DEFAULT 'want' CHECK (status IN ('want', 'watching', 'finished', 'dropped')),
  rating INTEGER DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review TEXT DEFAULT '',
  cover_url TEXT DEFAULT '',
  date_added TIMESTAMPTZ DEFAULT now(),
  date_consumed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Taste profiles (stored as JSONB for flexibility)
CREATE TABLE taste_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  profile_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Weekly liner notes
CREATE TABLE weekly_dumps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  week_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_id)
);

-- Scratchpad notes
CREATE TABLE scratchpad_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Heavy Rotation (top 8)
CREATE TABLE heavy_rotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  catalog_item_id UUID REFERENCES catalog_items(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, catalog_item_id)
);

-- Social: follows
CREATE TABLE follows (
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

-- Social: Consume Together sessions
CREATE TABLE together_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  media_title TEXT NOT NULL,
  media_creator TEXT,
  media_type TEXT NOT NULL,
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'in-progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE together_participants (
  session_id UUID REFERENCES together_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);

CREATE TABLE together_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES together_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activity feed
CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_catalog_user ON catalog_items(user_id);
CREATE INDEX idx_catalog_type ON catalog_items(user_id, type);
CREATE INDEX idx_weekly_user ON weekly_dumps(user_id);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
CREATE INDEX idx_activity_user ON activity_feed(user_id);
CREATE INDEX idx_together_creator ON together_sessions(creator_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## 5. Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE taste_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_dumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE scratchpad_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE heavy_rotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE together_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE together_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE together_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

-- Profiles: own profile full access, public profiles readable by all
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public profiles are viewable" ON profiles FOR SELECT USING (is_public = true);

-- Catalog: own items only
CREATE POLICY "Users can manage own catalog" ON catalog_items FOR ALL USING (auth.uid() = user_id);

-- Taste profiles: own only
CREATE POLICY "Users can manage own taste" ON taste_profiles FOR ALL USING (auth.uid() = user_id);

-- Weekly dumps: own only
CREATE POLICY "Users can manage own dumps" ON weekly_dumps FOR ALL USING (auth.uid() = user_id);

-- Scratchpad: own only
CREATE POLICY "Users can manage own scratchpad" ON scratchpad_notes FOR ALL USING (auth.uid() = user_id);

-- Heavy rotation: own only, but viewable on public profiles
CREATE POLICY "Users can manage own rotation" ON heavy_rotation_items FOR ALL USING (auth.uid() = user_id);

-- Follows: can manage own follows, can see who follows you
CREATE POLICY "Users can manage own follows" ON follows FOR ALL USING (auth.uid() = follower_id);
CREATE POLICY "Users can see their followers" ON follows FOR SELECT USING (auth.uid() = following_id);

-- Together: participants can view and manage
CREATE POLICY "Session creators manage sessions" ON together_sessions FOR ALL USING (auth.uid() = creator_id);
CREATE POLICY "Participants can view sessions" ON together_sessions FOR SELECT
  USING (id IN (SELECT session_id FROM together_participants WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own participation" ON together_participants FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Session members can add notes" ON together_notes FOR ALL
  USING (session_id IN (SELECT session_id FROM together_participants WHERE user_id = auth.uid()));

-- Activity: own only
CREATE POLICY "Users can manage own activity" ON activity_feed FOR ALL USING (auth.uid() = user_id);
```

## 6. Next Steps

After running the SQL above:
1. Restart your dev server
2. The app will detect the Supabase env vars and enable:
   - Google sign-in button on the login page
   - Real-time data sync across devices
   - Friend search with real users
   - Consume Together with real invites
3. Test by signing in with Google and verifying data persists
