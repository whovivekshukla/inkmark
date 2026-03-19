import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { googleAuthUrl } from '../api/client'

export function SignInPage(): React.ReactElement {
  const { user } = useAuth()

  if (user) {
    return <Navigate to={`/${encodeURIComponent(user.username)}`} replace />
  }

  return (
    <div className="shell shell--narrow home">
      <p className="landing-back">
        <Link className="link-back" to="/">
          ← Back
        </Link>
      </p>

      <header className="home-header">
        <h1 className="logo">Inkmark</h1>
        <p className="tagline">Sign in to save clips and open your feed.</p>
      </header>

      <div className="home-panel">
        <a className="btn btn--primary" href={googleAuthUrl()}>
          Continue with Google
        </a>
        <p className="fine-print muted">After Google, you’ll go straight to your feed.</p>
      </div>
    </div>
  )
}
