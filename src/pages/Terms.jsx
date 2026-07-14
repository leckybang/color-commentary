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

export default function Terms() {
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
          Terms of Service
        </h1>
        <p className="text-text-muted text-sm mb-10">Last updated {UPDATED}</p>

        <Section title="The short version">
          <p>
            Color Commentary is a personal media tracker offered as-is. Be
            reasonable with it, own what you post, and understand that we cannot
            promise it will be perfect or available forever. By using the app you
            agree to the terms below.
          </p>
        </Section>

        <Section title="Using the app">
          <p>
            You may use Color Commentary to track and share the media you enjoy.
            You agree not to misuse the service: no attempting to break or overload
            it, no scraping or bulk-extracting data, no using it for anything
            unlawful, and no posting content that is illegal, harassing, or
            infringes someone else&apos;s rights.
          </p>
        </Section>

        <Section title="Your account">
          <p>
            You are responsible for the activity on your account and for keeping
            your login secure. Please provide accurate information when you sign up.
            You must be at least 13 years old to use the app.
          </p>
        </Section>

        <Section title="Your content">
          <p>
            You own the content you create, including your library, ratings,
            reviews, and notes. By posting it you give us permission to store and
            display it so the app can work, including showing it on your public
            profile if you choose to make one public. You can edit or delete your
            content at any time.
          </p>
        </Section>

        <Section title="Third-party content and trademarks">
          <p>
            The app shows information about books, movies, shows, and music sourced
            from third-party providers such as TMDB, Google Books, The New York
            Times, Spotify, and Amazon. That content, along with cover art, titles,
            and logos, belongs to its respective owners and is used to help you
            identify what you are tracking. Color Commentary is not affiliated with
            or endorsed by these providers.
          </p>
        </Section>

        <Section title="Demo Mode">
          <p>
            Demo Mode keeps your data only in your browser. Clearing your browser
            storage or switching devices will lose that data. To save your library
            across devices, create an account.
          </p>
        </Section>

        <Section title="Availability and changes">
          <p>
            We may add, change, or remove features, and we may pause or discontinue
            the service at any time. We will try to give reasonable notice of major
            changes, but we cannot guarantee the app will always be available or
            error-free.
          </p>
        </Section>

        <Section title="Disclaimer and liability">
          <p>
            The service is provided &quot;as is,&quot; without warranties of any
            kind. To the fullest extent permitted by law, Color Commentary is not
            liable for any indirect or incidental damages, or for any loss of data,
            arising from your use of the app.
          </p>
        </Section>

        <Section title="Ending your use">
          <p>
            You can stop using the app and delete your account at any time. We may
            suspend or end access for accounts that violate these terms.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We may update these terms from time to time. When we do, we will revise
            the date at the top of this page. Continuing to use the app after a
            change means you accept the updated terms.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these terms? Email us at{' '}
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
