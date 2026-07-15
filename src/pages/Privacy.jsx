import { Link } from 'react-router-dom'

const UPDATED = 'July 14, 2026'

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2
        className="text-lg font-bold text-text-primary mb-2"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {title}
      </h2>
      <div className="text-sm text-text-secondary leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  )
}

export default function Privacy() {
  return (
    <div className="min-h-screen bg-bg-primary py-12 px-5">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/login"
          className="inline-block text-sm text-text-muted hover:text-text-secondary transition-colors mb-8"
        >
          ← Back
        </Link>

        <h1
          className="text-[34px] font-extrabold leading-[0.95] text-text-primary mb-2"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: '-1px' }}
        >
          Privacy Policy
        </h1>
        <p className="text-text-muted text-sm mb-10">Last updated {UPDATED}</p>

        <Section title="The short version">
          <p>
            Color Commentary is a personal media tracker. We collect the account
            details you sign up with and the media you choose to track. We do not
            sell your data, and we do not show ads. This page explains what we
            collect, why, and the choices you have.
          </p>
        </Section>

        <Section title="Information we collect">
          <p>
            <strong className="text-text-primary">Account information.</strong> When
            you create an account we store your name, email address, and, if you
            sign in with Google, your profile photo. If you choose Demo Mode
            instead, your data stays in your browser and is never sent to our
            servers.
          </p>
          <p>
            <strong className="text-text-primary">Content you create.</strong> The
            books, movies, shows, and albums you track, along with your ratings,
            reviews, notes, moodboards, taste preferences, and the people you
            follow.
          </p>
          <p>
            <strong className="text-text-primary">Local storage and cookies.</strong>{' '}
            We use browser storage to keep you signed in, remember your theme, and
            (in Demo Mode) save your library locally. We ask for your choice on
            non-essential cookies before setting them.
          </p>
        </Section>

        <Section title="How we use your information">
          <p>
            We use your information to run the core features of the app: saving
            your library, syncing it across your devices, generating your weekly
            radar and recommendations, and letting you share a public profile if
            you choose to. We do not use it for advertising.
          </p>
        </Section>

        <Section title="Analytics">
          <p>
            We use <strong className="text-text-primary">Google Analytics</strong> to
            understand how visitors find and use the app, so we can improve it. It
            tells us things like which pages are popular and roughly where our
            visitors come from. Analytics cookies are optional: they are only set
            after you accept them in the cookie banner, and you can decline without
            affecting how the app works.
          </p>
        </Section>

        <Section title="Services we rely on">
          <p>
            To make the app work we send requests to a handful of trusted
            providers. Your account and library are stored with{' '}
            <strong className="text-text-primary">Supabase</strong> (our database and
            authentication provider). Sign-in can be handled by{' '}
            <strong className="text-text-primary">Google</strong> if you use Google
            login.
          </p>
          <p>
            To look up details about titles you track, we query media catalogs
            including <strong className="text-text-primary">TMDB</strong> (movies and
            TV), <strong className="text-text-primary">Google Books</strong> and{' '}
            <strong className="text-text-primary">The New York Times</strong> (books),
            <strong className="text-text-primary"> Spotify</strong> (music), and{' '}
            <strong className="text-text-primary">Amazon</strong> (product links).
            These lookups are about the titles, not about you.
          </p>
          <p>
            Some features, such as your personalized recommendations and written
            summaries, are generated with{' '}
            <strong className="text-text-primary">Anthropic&apos;s Claude</strong>. To
            produce them we may send relevant parts of your library (for example,
            titles and ratings). This content is used to generate your result and
            is not used to train models.
          </p>
        </Section>

        <Section title="Public profiles">
          <p>
            If you set up a public profile, the content on it (your username, the
            titles you have chosen to show, and your ratings) is visible to anyone
            with the link. You control whether your profile is public, and you can
            make it private at any time.
          </p>
        </Section>

        <Section title="Sharing your information">
          <p>
            We do not sell your personal information and we do not share it with
            third parties for their own marketing. We share data only with the
            service providers listed above, as needed to operate the app, or when
            required by law.
          </p>
        </Section>

        <Section title="Keeping and deleting your data">
          <p>
            We keep your data for as long as your account is active. You can delete
            your account at any time, which removes your profile and library from
            our database. If you would like your account deleted or a copy of your
            data, contact us using the details below.
          </p>
        </Section>

        <Section title="Children">
          <p>
            Color Commentary is not directed to children under 13, and we do not
            knowingly collect information from them.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this policy from time to time. When we do, we will revise
            the date at the top of this page.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about your privacy or this policy? Email us at{' '}
            <a
              href="mailto:becky@ambiobranding.com"
              className="text-accent-primary hover:underline"
            >
              becky@ambiobranding.com
            </a>
            .
          </p>
        </Section>

        <p className="text-center text-[11px] text-text-muted mt-12">
          colorcommentary.app
        </p>
      </div>
    </div>
  )
}
