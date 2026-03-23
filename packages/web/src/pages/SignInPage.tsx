import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { googleAuthUrl } from '../api/client'
import { ThemeToggle } from '../components/ThemeToggle'

export function SignInPage(): React.ReactElement {
  const { user } = useAuth()

  if (user) {
    return <Navigate to="/library" replace />
  }

  return (
    <div className="shell shell--narrow home">
      <div className="sign-in-top">
        <Link className="link-back" to="/">
          ← Back
        </Link>
        <ThemeToggle />
      </div>

      <header className="home-header">
        <h1 className="logo">Inkmark</h1>
        <p className="tagline">
          Sign in to start saving clips, highlighting what matters, and building your reading library.
        </p>
      </header>

      <div className="home-panel">
        <a className="btn btn--primary" href={googleAuthUrl()}>
          Continue with Google
        </a>
      </div>
    </div>
  )
}
