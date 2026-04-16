# API Setup Guide — Media Search & Claude AI Parsing

To unlock the "live search" and "Parse with AI" features on the Liner Notes page, you'll need three things: a **TMDB** key (movies/TV), **Spotify** app credentials (music), and an **Anthropic** API key (Claude AI parsing). Books use Google Books, which needs no key.

Total cost: **~free** for hobbyist use. Claude runs on Haiku at fractions of a cent per request.

---

## 1. TMDB (Movies & TV) — Free

1. Go to [themoviedb.org](https://www.themoviedb.org/) and create a free account
2. Go to **Settings → API** in your account
3. Request an API key (the free "Developer" tier is fine)
4. Fill out the form — most fields can be basic/personal info
5. Copy the **API Read Access Token (v3 auth)**, i.e. the short key (NOT the long Bearer token)
6. Add to your local `.env`:
   ```
   VITE_TMDB_API_KEY=your_key_here
   ```
7. Add to **Netlify → Site settings → Environment variables** as well (same name + value)

**Rate limit:** ~40 req / 10 sec per IP. Our debouncing + caching keeps us well under.

---

## 1.5. Google Books (Books) — Free, Recommended

Google Books **works without a key** but aggressively rate-limits (returns 429 errors quickly). Add a free key to unlock the full 1000 req/day quota:

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Go to **APIs & Services → Library**
4. Search for **Books API** and enable it
5. Go to **APIs & Services → Credentials**
6. Click **+ Create Credentials → API key**
7. Copy the key
8. Add to your local `.env`:
   ```
   VITE_GOOGLE_BOOKS_API_KEY=your_key_here
   ```
9. Add to **Netlify → Site settings → Environment variables**

**Optional but strongly recommended** — without a key, book search will fail after the first few requests per day.

---

## 2. Spotify (Music) — Free

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and log in
2. Click **Create app**
3. Fill in:
   - **App name**: Color Commentary (or whatever)
   - **App description**: Personal media tracking
   - **Redirect URI**: leave blank or put your Netlify URL (not used for Client Credentials flow)
   - **Which API/SDKs**: Web API
4. Click **Save**
5. Go to **Settings** → copy the **Client ID** and **Client Secret**
6. Add to your local `.env` (**no VITE_ prefix** — these are server-only):
   ```
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   ```
7. Add both to **Netlify → Site settings → Environment variables**

**Important:** The Client Secret must NEVER end up in client code. Our Netlify Function handles all Spotify API calls server-side.

---

## 3. Anthropic (Claude AI Parsing)

1. Go to [console.anthropic.com](https://console.anthropic.com/) and sign up
2. Add a payment method (required, but usage is pay-as-you-go)
3. Go to **API Keys** → Create a new key
4. Copy it (starts with `sk-ant-`)
5. Add to your local `.env` (no VITE_ prefix):
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```
6. Add to **Netlify → Site settings → Environment variables**

**Cost:** Uses Claude Haiku 4.5, which is very cheap — typically **$0.001-0.005 per parse**. A user doing 10 parses/day would cost ~$0.30/month. You can set a spending limit in your Anthropic dashboard.

---

## 4. Set your production URL (for CORS)

Add this to Netlify env vars (and optionally your local `.env`):
```
ALLOWED_ORIGIN=https://color-commentary.netlify.app
```
(Replace with your actual domain. Localhost is always allowed automatically.)

---

## 5. Deploy

After adding all env vars to Netlify:

1. Go to **Netlify → Deploys**
2. Click **Trigger deploy → Deploy site**
3. Wait ~1-2 minutes for the build
4. Test it:
   - Go to Liner Notes → type in any section → should see real search results with cover art
   - Write something in "Notes & Thoughts" → click **✨ Parse with AI** → should parse into structured items

---

## Running locally with functions

For the Spotify + Claude functions to work in local dev, you need `netlify-cli`:

```bash
npm install -g netlify-cli
netlify dev
```

This proxies your Vite dev server + exposes functions at `/.netlify/functions/*`. Visit `http://localhost:8888`.

If you just run `npm run dev`, TMDB and Google Books will work, but Spotify and AI Parse won't (they need the functions running).

---

## Troubleshooting

**"No search results for movies/TV"** → Check `VITE_TMDB_API_KEY` is set and you've redeployed.

**"Spotify search fails silently"** → Check `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are in Netlify env vars. Check Netlify function logs for errors.

**"AI Parse returns 'AI service unavailable'"** → Check `ANTHROPIC_API_KEY` is set. Check your Anthropic account has credits.

**CORS errors locally** → Make sure `ALLOWED_ORIGIN=http://localhost:5173` in your local `.env` (or use `netlify dev` which handles this automatically).

**"AI Parse returns 'AI parsing not configured on server'"** → The Netlify Function can't see your env var. Redeploy after setting it.
