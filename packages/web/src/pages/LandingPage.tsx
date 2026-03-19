import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const features = [
  {
    title: 'Clip articles',
    body: 'Save articles and pages in one place—always tied to the source, never lost in a tab pile.',
  },
  {
    title: 'Highlight what matters',
    body: 'Mark passages that stick with you. Your highlights stay anchored to each clip.',
  },
  {
    title: 'Reading, organized',
    body: 'A quieter library for serious readers: less noise, more of the ideas you actually care about.',
  },
] as const

export function LandingPage(): React.ReactElement {
  const { user } = useAuth()

  return (
    <div className="landing">
      <header className="shell shell--landing landing-nav">
        <Link className="landing-logo" to="/">
          Inkmark
        </Link>
        <nav className="landing-nav-actions" aria-label="Account">
          {user ? (
            <Link className="btn btn--ghost" to={`/${encodeURIComponent(user.username)}`}>
              Profile
            </Link>
          ) : (
            <Link className="btn btn--ghost" to="/sign-in">
              Sign in
            </Link>
          )}
        </nav>
      </header>

      <main>
        <section className="shell shell--landing landing-hero" aria-labelledby="landing-heading">
          <h1 id="landing-heading" className="landing-hero-title">
            Save articles.
            <br />
            Surface what matters.
          </h1>
          <p className="landing-hero-lede">
            Inkmark is a minimal home for clips and highlights—built for people who read deeply and want
            their shelf to stay legible.
          </p>
          <div className="landing-hero-cta">
            <Link className="btn btn--primary landing-cta-primary" to="/sign-in">
              Get started
            </Link>
            <a className="btn btn--secondary" href="#features">
              See how it works
            </a>
          </div>
        </section>

        <section id="features" className="shell shell--landing landing-features" aria-labelledby="features-heading">
          <h2 id="features-heading" className="section-label">
            How it works
          </h2>
          <ul className="landing-feature-list">
            {features.map((f) => (
              <li key={f.title} className="landing-feature">
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-feature-body">{f.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="shell shell--landing landing-bottom" aria-label="Get started">
          <div className="landing-bottom-card">
            <p className="landing-bottom-title">Start your shelf</p>
            <p className="landing-bottom-copy muted">
              Sign in with Google—no new password, no clutter.
            </p>
            <Link className="btn btn--primary" to="/sign-in">
              Continue to Inkmark
            </Link>
          </div>
        </section>
      </main>

      <footer className="shell shell--landing landing-footer">
        <p className="landing-footer-note muted">Inkmark · social reading, quietly done.</p>
      </footer>
    </div>
  )
}
