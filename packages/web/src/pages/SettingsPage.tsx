import { FormEvent, useCallback, useEffect, useState, type ReactElement } from 'react'
import { Link } from 'react-router-dom'
import type { PersonalAccessTokenCreatedModel, PersonalAccessTokenModel } from '@inkmark/shared'
import {
  ApiError,
  createPersonalAccessToken,
  isSessionJwt,
  listPersonalAccessTokens,
  revokePersonalAccessToken,
  updateProfile,
} from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { mcpUrl, TOKEN_PLACEHOLDER } from '../lib/connectSnippets'
import { useTheme, type Theme } from '../theme/ThemeContext'
import './settings.css'

const USERNAME_RE = /^[a-z0-9_]{3,30}$/
const MAX_BIO_LENGTH = 500

/** Integrations Inkmark already documents in the Connect guide — presented here as available, not "live." */
const AVAILABLE_AGENTS = [
  {
    key: 'claude',
    glyph: 'C',
    name: 'Claude',
    detail: 'Connect by URL — remote MCP, no install',
  },
  {
    key: 'codex',
    glyph: 'X',
    name: 'Codex CLI',
    detail: 'Bridges over stdio via mcp-remote',
  },
  {
    key: 'extension',
    glyph: 'E',
    name: 'Browser extension',
    detail: 'Clip and highlight from any page',
  },
] as const

function formatTokenDate(iso: Date | string | null): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function tokenIsActive(t: PersonalAccessTokenModel): boolean {
  if (t.revokedAt) return false
  if (t.expiresAt && new Date(t.expiresAt) < new Date()) return false
  return true
}

export function SettingsPage(): ReactElement {
  const { user, token, refreshUser, signOut } = useAuth()
  const canManagePat = isSessionJwt(token)
  const { theme, setTheme } = useTheme()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSaved, setProfileSaved] = useState(false)

  const [pats, setPats] = useState<PersonalAccessTokenModel[]>([])
  const [patsLoading, setPatsLoading] = useState(false)
  const [patsError, setPatsError] = useState<string | null>(null)
  const [patName, setPatName] = useState('')
  const [patExpiresLocal, setPatExpiresLocal] = useState('')
  const [patCreating, setPatCreating] = useState(false)
  const [newlyCreated, setNewlyCreated] = useState<PersonalAccessTokenCreatedModel | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setDisplayName(user.displayName)
    setUsername(user.username)
    setBio(user.bio ?? '')
  }, [user])

  const loadPats = useCallback(async () => {
    if (!token || !canManagePat) return
    setPatsLoading(true)
    setPatsError(null)
    try {
      const list = await listPersonalAccessTokens(token)
      setPats(list)
    } catch (e) {
      setPats([])
      setPatsError(e instanceof ApiError ? e.message : 'Failed to load tokens')
    } finally {
      setPatsLoading(false)
    }
  }, [token, canManagePat])

  useEffect(() => {
    void loadPats()
  }, [loadPats])

  const onSaveProfile = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    if (!token || !user) return
    setProfileError(null)
    setProfileSaved(false)
    const dn = displayName.trim()
    const un = username.trim().toLowerCase()
    const b = bio.trim()
    if (dn.length < 1) {
      setProfileError('Display name is required.')
      return
    }
    if (!USERNAME_RE.test(un)) {
      setProfileError('Username must be 3–30 characters: lowercase letters, numbers, underscores only.')
      return
    }
    if (b.length > MAX_BIO_LENGTH) {
      setProfileError('Bio must be 500 characters or less.')
      return
    }
    setProfileSaving(true)
    try {
      await updateProfile(token, { displayName: dn, username: un, bio: b })
      await refreshUser()
      setProfileSaved(true)
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : 'Could not save profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const onCreatePat = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    if (!token || !canManagePat) return
    const name = patName.trim()
    if (!name) return
    setPatsError(null)
    setPatCreating(true)
    try {
      const expiresAt =
        patExpiresLocal.length > 0 ? new Date(patExpiresLocal).toISOString() : undefined
      const created = await createPersonalAccessToken(token, { name, ...(expiresAt ? { expiresAt } : {}) })
      setNewlyCreated(created)
      setPatName('')
      setPatExpiresLocal('')
      await loadPats()
    } catch (err) {
      setPatsError(err instanceof ApiError ? err.message : 'Could not create token')
    } finally {
      setPatCreating(false)
    }
  }

  const onRevokePat = async (id: string): Promise<void> => {
    if (!token || !canManagePat) return
    setRevokingId(id)
    setPatsError(null)
    try {
      await revokePersonalAccessToken(token, id)
      await loadPats()
    } catch (err) {
      setPatsError(err instanceof ApiError ? err.message : 'Could not revoke token')
    } finally {
      setRevokingId(null)
    }
  }

  const copyNewToken = async (): Promise<void> => {
    if (!newlyCreated?.token) return
    try {
      await navigator.clipboard.writeText(newlyCreated.token)
    } catch {
      /* ignore */
    }
  }

  if (!user) {
    return (
      <div className="page-wide">
        <p className="empty-state">Loading…</p>
      </div>
    )
  }

  const endpoint = mcpUrl()

  return (
    <div className="page-wide settings-page settings-page--redesign">
      <p className="settings-back">
        <Link className="link-back" to="/library">
          ← Library
        </Link>
      </p>

      <header className="page-header settings-header">
        <h1 className="page-title settings-title">Settings</h1>
        <p className="page-lede">Profile and API access</p>
      </header>

      <section className="settings-section" id="profile" aria-labelledby="settings-profile-heading">
        <h2 id="settings-profile-heading" className="section-rule-heading settings-section-heading">
          Profile
        </h2>
        <form className="settings-form" onSubmit={onSaveProfile}>
          <p className="settings-static">
            <span className="settings-label">Email</span>
            <span className="settings-value">{user.email}</span>
            <span className="settings-hint">From Google — not editable here.</span>
          </p>

          <div className="settings-field">
            <label className="settings-label" htmlFor="settings-display-name">
              Display name
            </label>
            <input
              id="settings-display-name"
              className="settings-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="settings-field">
            <label className="settings-label" htmlFor="settings-username">
              Username
            </label>
            <input
              id="settings-username"
              className="settings-input"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              autoComplete="username"
              spellCheck={false}
            />
            <span className="settings-hint">3–30 characters. Lowercase letters, numbers, underscores.</span>
          </div>

          <div className="settings-field">
            <div className="settings-field-head">
              <label className="settings-label" htmlFor="settings-bio">
                Bio
              </label>
              <span className="settings-hint settings-bio-counter">
                {bio.length}/{MAX_BIO_LENGTH}
              </span>
            </div>
            <textarea
              id="settings-bio"
              className="settings-textarea settings-textarea--bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={MAX_BIO_LENGTH}
            />
          </div>

          {profileError ? <p className="error settings-alert">{profileError}</p> : null}
          {profileSaved ? <p className="settings-success">Saved.</p> : null}

          <div className="settings-footer-actions">
            <button type="submit" className="btn btn--primary settings-submit" disabled={profileSaving}>
              {profileSaving ? 'Saving…' : 'Save profile'}
            </button>
            <button type="button" className="link-quiet-signout settings-signout" onClick={signOut}>
              Sign out
            </button>
          </div>
        </form>
      </section>

      <section className="settings-section" id="agent-access" aria-labelledby="settings-agent-heading">
        <h2 id="settings-agent-heading" className="section-rule-heading settings-section-heading">
          Agent access · MCP
        </h2>
        <p className="settings-lede">
          Let Claude and other AI hosts clip and highlight on your behalf over MCP. Point your host at the
          endpoint below and authenticate with a personal access token.
        </p>

        <div className="settings-field">
          <label className="settings-label" htmlFor="settings-mcp-endpoint">
            MCP endpoint
          </label>
          <div className="settings-endpoint-row">
            <code id="settings-mcp-endpoint" className="settings-endpoint">
              {endpoint}
            </code>
            <button
              type="button"
              className="btn btn--secondary settings-endpoint-copy"
              onClick={() => void navigator.clipboard.writeText(endpoint).catch(() => undefined)}
            >
              Copy
            </button>
          </div>
        </div>

        <div className="settings-field settings-api-key">
          <label className="settings-label" htmlFor="settings-api-key">
            API key
          </label>

          {!canManagePat ? (
            <p className="empty-state empty-state--inline">
              You’re signed in with a personal access token. Sign in with Google from another browser
              session to create or revoke tokens here.
            </p>
          ) : (
            <>
              {newlyCreated ? (
                <div className="settings-pat-reveal" role="alert">
                  <p className="settings-pat-reveal-title">Copy your new token</p>
                  <p className="settings-hint">You won’t see it again. Store it somewhere safe.</p>
                  <pre className="settings-pat-secret">{newlyCreated.token}</pre>
                  <div className="settings-pat-reveal-actions">
                    <button type="button" className="btn btn--secondary" onClick={() => void copyNewToken()}>
                      Copy
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={() => setNewlyCreated(null)}>
                      Done
                    </button>
                  </div>
                </div>
              ) : null}

              <form className="settings-form settings-form--inline" onSubmit={onCreatePat}>
                <div className="settings-field settings-field--grow">
                  <label className="settings-label" htmlFor="pat-name">
                    New token name
                  </label>
                  <input
                    id="pat-name"
                    className="settings-input"
                    value={patName}
                    onChange={(e) => setPatName(e.target.value)}
                    placeholder="e.g. MCP, CLI"
                  />
                </div>
                <div className="settings-field">
                  <label className="settings-label" htmlFor="pat-expires">
                    Expires (optional)
                  </label>
                  <input
                    id="pat-expires"
                    className="settings-input"
                    type="datetime-local"
                    value={patExpiresLocal}
                    onChange={(e) => setPatExpiresLocal(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn--secondary settings-pat-create" disabled={patCreating}>
                  {patCreating ? 'Creating…' : 'Create token'}
                </button>
              </form>

              {patsError ? <p className="error settings-alert">{patsError}</p> : null}

              {patsLoading ? (
                <p className="app-boot-text">Loading tokens</p>
              ) : pats.length === 0 ? (
                <p className="empty-state empty-state--inline">No tokens yet.</p>
              ) : (
                <ul className="settings-pat-list">
                  {pats.map((t) => (
                    <li key={t.id} className="settings-pat-row">
                      <div className="settings-pat-main">
                        <span className="settings-pat-name">{t.name}</span>
                        <code className="settings-pat-prefix">{t.prefix}…</code>
                        <span className="settings-pat-meta">
                          Created {formatTokenDate(t.createdAt)}
                          {t.lastUsedAt ? ` · Last used ${formatTokenDate(t.lastUsedAt)}` : ''}
                          {t.expiresAt ? ` · Expires ${formatTokenDate(t.expiresAt)}` : ''}
                          {t.revokedAt ? ` · Revoked ${formatTokenDate(t.revokedAt)}` : ''}
                        </span>
                        {!tokenIsActive(t) ? (
                          <span className="settings-pat-badge">{t.revokedAt ? 'Revoked' : 'Expired'}</span>
                        ) : null}
                      </div>
                      {tokenIsActive(t) ? (
                        <button
                          type="button"
                          className="link-quiet-signout settings-pat-revoke"
                          disabled={revokingId === t.id}
                          onClick={() => void onRevokePat(t.id)}
                        >
                          {revokingId === t.id ? 'Revoking…' : 'Revoke'}
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="settings-field">
          <span className="settings-label">Connected agents</span>
          <ul className="settings-agent-list">
            {AVAILABLE_AGENTS.map((agent) => (
              <li key={agent.key} className="settings-agent-row">
                <span className="settings-agent-glyph" aria-hidden="true">
                  {agent.glyph}
                </span>
                <span className="settings-agent-info">
                  <span className="settings-agent-name">{agent.name}</span>
                  <span className="settings-agent-detail">{agent.detail}</span>
                </span>
                <span className="settings-agent-status">
                  <span className="settings-agent-dot" aria-hidden="true" />
                  Available
                </span>
                <Link className="settings-agent-action" to="/connect">
                  Set up
                </Link>
              </li>
            ))}
          </ul>
          <p className="settings-hint settings-connect-note">
            Replace <code>{TOKEN_PLACEHOLDER}</code> with a token from the API key section above, or see the
            full <Link to="/connect">setup guide</Link> for host-specific config, including the Chrome
            extension.
          </p>
        </div>
      </section>

      <section className="settings-section" id="appearance" aria-labelledby="settings-appearance-heading">
        <h2 id="settings-appearance-heading" className="section-rule-heading settings-section-heading">
          Appearance
        </h2>
        <div className="settings-theme-track" role="radiogroup" aria-label="Theme">
          {(['light', 'dark'] as Theme[]).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={theme === t}
              className={`settings-theme-segment${theme === t ? ' settings-theme-segment--active' : ''}`}
              onClick={() => setTheme(t)}
            >
              {t === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
