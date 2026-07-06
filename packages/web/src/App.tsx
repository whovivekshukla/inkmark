import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { AppShell } from './layout/AppShell'
import { RequireAuth } from './layout/RequireAuth'
import { ClipDetailPage } from './pages/ClipDetailPage'
import { ConnectPage } from './pages/ConnectPage'
import { FeedPage } from './pages/FeedPage'
import { LandingPage } from './pages/LandingPage'
import { LibraryPage } from './pages/LibraryPage'
import { ProfilePage } from './pages/ProfilePage'
import { SettingsPage } from './pages/SettingsPage'
import { SignInPage } from './pages/SignInPage'

function RootRoute(): React.ReactElement {
  const { user } = useAuth()
  if (user) {
    return <Navigate to="/library" replace />
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
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/highlights" element={<Navigate to="/feed" replace />} />
          {/* Search is now a global ⌘K overlay; keep the path as a redirect for old links. */}
          <Route path="/search" element={<Navigate to="/library" replace />} />
          <Route path="/connect" element={<ConnectPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/clips/:clipId" element={<ClipDetailPage />} />
          <Route path="/:username" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
