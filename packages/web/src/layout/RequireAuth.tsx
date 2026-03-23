import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function RequireAuth(): React.ReactElement {
  const { token, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="shell shell--narrow app-boot">
        <p className="app-boot-text">Loading</p>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
