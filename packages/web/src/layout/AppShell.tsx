import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { AvatarImg } from '../components/AvatarImg'
import { ThemeToggle } from '../components/ThemeToggle'
import { SearchOverlayProvider, useSearchOverlay } from '../search/SearchOverlay'

const navClass = ({ isActive }: { isActive: boolean }): string =>
  `app-nav-link${isActive ? ' app-nav-link--active' : ''}`

function HeaderSearchButton(): React.ReactElement {
  const { open } = useSearchOverlay()
  return (
    <button type="button" className="app-search-btn" onClick={open} aria-label="Search (⌘K)">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <span className="app-search-btn__label">Search</span>
      <span className="keycap">⌘K</span>
    </button>
  )
}

export function AppShell(): React.ReactElement {
  const { user } = useAuth()

  return (
    <SearchOverlayProvider>
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
              <NavLink className={navClass} to="/feed">
                Feed
              </NavLink>
              <NavLink className={navClass} to="/settings">
                Settings
              </NavLink>
            </nav>
            <div className="app-topnav-trailing">
              <HeaderSearchButton />
              <span className="mcp-pill" title="Connected to your agents over MCP">
                <span className="mcp-pill__dot" aria-hidden />
                MCP
              </span>
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
                    <span className="app-topnav-avatar-placeholder">
                      {user.displayName.slice(0, 1).toUpperCase()}
                    </span>
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
    </SearchOverlayProvider>
  )
}
