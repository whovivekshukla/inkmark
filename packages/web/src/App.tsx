import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { LandingPage } from './pages/LandingPage'
import { SignInPage } from './pages/SignInPage'
import { ProfilePage } from './pages/ProfilePage'

function RootRoute(): React.ReactElement {
  const { user } = useAuth()
  if (user) {
    return <Navigate to={`/${encodeURIComponent(user.username)}`} replace />
  }
  return <LandingPage />
}

export function App(): React.ReactElement {
  const { ready } = useAuth()

  if (!ready) {
    return (
      <div className="shell shell--narrow app-boot">
        <p className="app-boot-text">Loading</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/:username" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
