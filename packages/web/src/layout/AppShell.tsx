import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { AvatarImg } from '../components/AvatarImg'
import { ThemeToggle } from '../components/ThemeToggle'

const navClass = ({ isActive }: { isActive: boolean }): string =>
  `app-nav-link${isActive ? ' app-nav-link--active' : ''}`

export function AppShell(): React.ReactElement {
  const { user } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-topnav">
        <div className="app-topnav-inner">
          <Link className="app-topnav-logo" to="/library">
            Inkmark
          </Link>
          <nav className="app-topnav-links" aria-label="Main">
            <NavLink className={navClass} to="/library" end>
              Library
            </NavLink>
            <span className="app-topnav-sep" aria-hidden>
              ·
            </span>
            <NavLink className={navClass} to="/feed">
              Feed
            </NavLink>
            <span className="app-topnav-sep" aria-hidden>
              ·
            </span>
            <NavLink className={navClass} to="/search">
              Search
            </NavLink>
            <span className="app-topnav-sep" aria-hidden>
              ·
            </span>
            <NavLink className={navClass} to="/settings">
              Settings
            </NavLink>
          </nav>
          <div className="app-topnav-trailing">
            <ThemeToggle variant="nav" />
            {user ? (
              <Link
                className="app-topnav-avatar"
                to={`/${encodeURIComponent(user.username)}`}
                aria-label={`Profile: ${user.displayName}`}
              >
                {user.avatarUrl ? (
                  <AvatarImg src={user.avatarUrl} alt="" width={32} height={32} />
                ) : (
                  <span className="app-topnav-avatar-placeholder">{user.displayName.slice(0, 1).toUpperCase()}</span>
                )}
              </Link>
            ) : null}
          </div>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
