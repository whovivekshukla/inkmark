import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { googleAuthUrl } from '../api/client'
import { ThemeToggle } from '../components/ThemeToggle'
import './landing.css'

export function SignInPage(): React.ReactElement {
  const { user } = useAuth()

  if (user) {
    return <Navigate to="/library" replace />
  }

  return (
    <div className="sign-in-page">
      <div className="sign-in-top">
        <Link className="link-back" to="/">
          ← Back
        </Link>
        <ThemeToggle />
      </div>

      <div className="sign-in-center">
        <div className="sign-in-card">
          <h1 className="sign-in-logo">Inkmark</h1>
          <p className="sign-in-intro">
            Sign in to start saving clips, highlighting what matters, and building your reading library.
          </p>
          <div className="sign-in-divider" role="presentation" />
          <a className="btn btn--primary sign-in-google" href={googleAuthUrl()}>
            Continue with Google
          </a>
          <p className="sign-in-fine-print">
            By continuing, you agree to use Inkmark responsibly and respect the sources you clip.
          </p>
        </div>
      </div>
    </div>
  )
}
