# Weekly Radar Email Setup

Users can opt in to receiving their personalized Weekly Radar every Monday morning via email. Since this requires a scheduled job + email sending (both outside the browser), here's how to wire it up.

## Prerequisites
- Supabase project configured
- `profiles.email_radar` column enabled (see `SUPABASE_MIGRATIONS.md`)
- An email sending service (we recommend **Resend** — free tier includes 3k emails/month)

## Step 1 — Sign up for Resend

1. Go to [resend.com](https://resend.com) and create a free account
2. Verify your sending domain (or use their `onboarding@resend.dev` address for testing)
3. Create an API key in **Dashboard → API Keys**
4. Copy it

## Step 2 — Add Resend API key to your project

In **Supabase Dashboard → Project Settings → Edge Functions → Secrets**, add:

```
RESEND_API_KEY=re_your_key_here
FROM_EMAIL=hello@yourdomain.com
```

## Step 3 — Create the Supabase Edge Function

Supabase CLI:

```bash
supabase functions new weekly-radar-email
```

Paste this into `supabase/functions/weekly-radar-email/index.ts`:

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'hello@example.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!)

  // Get all users opted in
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, display_name, username')
    .eq('email_radar', true)

  for (const user of users || []) {
    if (!user.email) continue

    // Build the email — ideally you'd pull their actual radar items
    // here, but for v1, link them to the app:
    const html = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #333;">
        <h1 style="font-size: 28px; margin-bottom: 8px;">Your Weekly Radar</h1>
        <p style="color: #888; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
          Hi ${user.display_name || 'there'},
        </p>
        <p style="font-size: 16px; line-height: 1.6;">
          Your weekly dispatch is ready. New releases and discoveries based on your taste — we've been paying attention.
        </p>
        <div style="margin: 30px 0;">
          <a href="https://color-commentary.netlify.app/radar"
             style="display: inline-block; background: #c49bff; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Read Your Radar →
          </a>
        </div>
        <p style="font-size: 14px; color: #888;">
          Don't forget to jot down what you've been into this week in your Liner Notes.
        </p>
        <p style="font-size: 12px; color: #aaa; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
          You're receiving this because you opted in to Weekly Radar emails.
          <a href="https://color-commentary.netlify.app/calibrate" style="color: #c49bff;">Manage preferences</a>
        </p>
      </div>
    `

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: user.email,
        subject: `Your Weekly Radar — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        html,
      }),
    })
  }

  return new Response(JSON.stringify({ ok: true, count: users?.length || 0 }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

Deploy:
```bash
supabase functions deploy weekly-radar-email
```

## Step 4 — Schedule it for Monday mornings

In **Supabase Dashboard → Database → Cron Jobs**, create a new job:

- **Name**: `weekly-radar-email`
- **Schedule**: `0 13 * * 1` (Monday at 13:00 UTC = 9am ET, 6am PT)
- **SQL**:
  ```sql
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/weekly-radar-email',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  ```

## Future improvements

- Include actual radar items (new releases + discoveries) directly in the email body
- Let users customize the send day/time
- Add an unsubscribe link that sets `email_radar = false`
- Track opens/clicks via Resend's webhook events

For now, the toggle in the Taste Calibrator records the preference. Once you set up the above, users who opt in will receive weekly emails.
