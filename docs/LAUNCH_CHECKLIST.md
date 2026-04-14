# Color Commentary — Launch Checklist

A step-by-step punchlist to get this app live on the internet. Budget about 2-3 hours for the full setup, or just do GitHub + Netlify (30 min) to get a working demo up first.

---

## Phase 1: Get It On GitHub (15 min)

### 1. Create the repo
```bash
cd "/Users/beckyradecki/Downloads/color commentary"
git init
git add -A
git commit -m "Initial commit: Color Commentary"
```

### 2. Push to GitHub
- Go to [github.com/new](https://github.com/new)
- Create repo called `color-commentary` (public or private, your call)
- Follow the instructions to push:
```bash
git remote add origin https://github.com/YOUR_USERNAME/color-commentary.git
git branch -M main
git push -u origin main
```

---

## Phase 2: Deploy on Netlify (15 min)

### 1. Connect to Netlify
- Go to [app.netlify.com](https://app.netlify.com)
- Click **"Add new site" → "Import an existing project"**
- Connect your GitHub account
- Select the `color-commentary` repo

### 2. Build settings
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: Add environment variable `NODE_VERSION` = `20`

### 3. Fix client-side routing
Create this file before deploying (or do it now):

**Create `public/_redirects`:**
```
/*    /index.html   200
```
This tells Netlify to serve your React app for all routes (otherwise /radar, /friends, etc. will 404 on refresh).

### 4. Deploy!
- Click **"Deploy site"**
- Netlify will build and give you a URL like `https://random-name.netlify.app`
- You can add a custom domain later in **Site settings → Domain management**

### 5. Test it
- Visit your Netlify URL
- Try Demo Mode
- Click through onboarding
- Verify all pages work
- Check that theme switching works
- Make sure the cookie banner appears

**At this point, you have a fully working app with localStorage!** Everything works without Supabase. The social features (friends, group chat) work in demo mode with mock data.

---

## Phase 3: Set Up Supabase (45-60 min)

This unlocks: Google sign-in, real user accounts, data that syncs across devices, and real social features.

### 1. Create project
- Go to [supabase.com](https://supabase.com) → New Project
- Name: `color-commentary`
- Set a strong database password (save it!)
- Region: pick closest to your users
- Wait for it to spin up (~2 min)

### 2. Get your keys
- Go to **Settings → API**
- Copy the **Project URL** (looks like `https://xxxxx.supabase.co`)
- Copy the **anon/public key** (starts with `eyJ...`)

### 3. Set up Google OAuth
Follow the detailed steps in `docs/SUPABASE_SETUP.md` section 3, but the short version:
- Google Cloud Console → Create OAuth credentials
- Add redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
- Supabase dashboard → Authentication → Providers → Google → paste credentials

### 4. Run the database schema
- Go to Supabase **SQL Editor**
- Copy ALL the SQL from `docs/SUPABASE_SETUP.md` sections 4 and 5
- Run it (creates all tables + RLS policies)

### 5. Add env vars to Netlify
- Netlify dashboard → Site settings → Environment variables
- Add:
  - `VITE_SUPABASE_URL` = your project URL
  - `VITE_SUPABASE_ANON_KEY` = your anon key
- **Trigger a redeploy** (Deploys → Trigger deploy)

### 6. Add env vars locally (for development)
Create `.env` in your project root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
(This file is already in `.gitignore` — don't commit it!)

### 7. Test Google sign-in
- Visit your Netlify URL
- You should now see "Sign in with Google" on the login page
- Sign in → verify it creates a user in Supabase → verify onboarding works

---

## Phase 4: Custom Domain (10 min, optional)

### Option A: Buy a domain
- [Namecheap](https://namecheap.com), [Porkbun](https://porkbun.com), or [Cloudflare](https://cloudflare.com) are good registrars
- Something like `colorcommentary.app` or `colorcommentary.co`

### Option B: Connect to Netlify
- Netlify → Site settings → Domain management → Add custom domain
- Follow their DNS instructions (usually just change nameservers or add a CNAME)
- Netlify handles HTTPS automatically

---

## Phase 5: Affiliate Links (10 min, optional)

See `docs/AFFILIATE_SETUP.md` for full details, but the quick version:

1. **Amazon Associates**: Sign up → get your tag → edit `src/utils/mediaLinks.js` → set `AFFILIATE_TAG`
2. **Bookshop.org**: Sign up → get your ID → set `BOOKSHOP_ID` in same file
3. **Add FTC disclosure** to your app footer or about page
4. Commit, push, auto-deploys on Netlify

---

## Phase 6: Polish Before Sharing (optional)

- [ ] Add a favicon (replace `public/favicon.svg`)
- [ ] Update `<title>` in `index.html` if needed
- [ ] Add meta tags for social sharing (og:image, og:description)
- [ ] Add a simple `/about` or `/privacy` page
- [ ] Test on mobile (responsive should work but always good to check)
- [ ] Clear localStorage and do a fresh onboarding run-through
- [ ] Try all 3 themes end-to-end
- [ ] Proofread any copy you want to change

---

## Quick Reference

| What | Where |
|------|-------|
| Local dev | `npm run dev` → `localhost:5173` |
| Build for production | `npm run build` |
| GitHub repo | `github.com/YOUR_USERNAME/color-commentary` |
| Netlify dashboard | `app.netlify.com` |
| Supabase dashboard | `supabase.com/dashboard` |
| Supabase setup guide | `docs/SUPABASE_SETUP.md` |
| Affiliate setup guide | `docs/AFFILIATE_SETUP.md` |
| Theme config | `src/config/themes.js` |
| Mock data | `src/services/mockData.js` |

---

## The "I Have 5 Minutes" Version

If you just want to get it live ASAP:

1. Push to GitHub
2. Connect to Netlify
3. Add `public/_redirects` file
4. Deploy
5. Share the URL

Everything works without Supabase. Google auth, real database, and social features come later when you're ready.
