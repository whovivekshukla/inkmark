import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ThemeToggle } from '../components/ThemeToggle'
import './landing.css'

const steps = [
  {
    number: '01',
    title: 'Clip',
    body: 'Save any article or URL. Inkmark keeps the source, title, and readable text.',
  },
  {
    number: '02',
    title: 'Highlight',
    body: 'Mark the passages that matter. Highlights stay anchored to the clip.',
  },
  {
    number: '03',
    title: 'Organize',
    body: 'Tag and filter your library. A quiet shelf for serious readers.',
  },
  {
    number: '04',
    title: 'Hand to agents',
    body: 'Every clip and highlight is readable and writable by your AI agents over MCP.',
  },
] as const

export function LandingPage(): React.ReactElement {
  const { user } = useAuth()

  return (
    <div className="landing">
      <header className="landing-nav">
        <Link className="landing-logo" to="/">
          Inkmark
        </Link>
        <nav className="landing-nav-actions" aria-label="Account">
          <ThemeToggle />
          {user ? (
            <Link className="btn btn--ghost" to="/library">
              Library
            </Link>
          ) : (
            <Link className="btn btn--ghost" to="/sign-in">
              Sign in
            </Link>
          )}
        </nav>
      </header>

      <main className="landing-main">
        <section className="landing-hero" aria-labelledby="landing-heading">
          <p className="landing-eyebrow">Read deeply · Stay legible</p>
          <h1 id="landing-heading" className="landing-hero-title">
            Save what you read.
            <br />
            Surface what matters.
          </h1>
          <p className="landing-hero-lede">
            Clip articles and URLs, highlight the passages that matter, and keep everything tied to its
            source. Your whole library is readable by your agents over MCP.
          </p>
          <div className="landing-hero-cta">
            <Link className="btn btn--primary landing-cta-primary" to="/sign-in">
              Get started
            </Link>
            <Link className="btn btn--secondary" to="/library">
              See the app
            </Link>
          </div>
        </section>

        <section className="landing-how" aria-labelledby="how-heading">
          <p id="how-heading" className="landing-mono-label">
            How it works
          </p>
          <ul className="landing-steps">
            {steps.map((step) => (
              <li key={step.number} className="landing-step">
                <p className="landing-step-number">{step.number}</p>
                <h3 className="landing-step-title">{step.title}</h3>
                <p className="landing-step-body">{step.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
