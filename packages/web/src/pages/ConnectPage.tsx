import { FormEvent, useState, type ReactElement } from 'react'
import { Link } from 'react-router-dom'
import type { PersonalAccessTokenCreatedModel } from '@inkmark/shared'
import { ApiError, createPersonalAccessToken, isSessionJwt } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { CopyBlock } from '../components/CopyBlock'
import {
  apiHost,
  claudeCodeHttpCommand,
  mcpRemoteConfig,
  mcpUrl,
  mcpUrlConfig,
  TOKEN_PLACEHOLDER,
} from '../lib/connectSnippets'

export function ConnectPage(): ReactElement {
  const { token } = useAuth()
  const canManagePat = isSessionJwt(token)

  const [tokenName, setTokenName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<PersonalAccessTokenCreatedModel | null>(null)

  const host = apiHost()
  const url = mcpUrl()
  const activeToken = created?.token ?? TOKEN_PLACEHOLDER

  const onCreateToken = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    if (!token || !canManagePat) return
    const name = tokenName.trim()
    if (!name) return
    setError(null)
    setCreating(true)
    try {
      const result = await createPersonalAccessToken(token, { name })
      setCreated(result)
      setTokenName('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create token')
    } finally {
      setCreating(false)
    }
  }

  const copyToken = async (): Promise<void> => {
    if (!created?.token) return
    try {
      await navigator.clipboard.writeText(created.token)
    } catch {
      /* clipboard unavailable — user can select manually */
    }
  }

  return (
    <div className="page-wide connect-page">
      <p className="settings-back">
        <Link className="link-back" to="/library">
          ← Library
        </Link>
      </p>

      <header className="page-header connect-intro">
        <h1 className="page-title">Set up clipping</h1>
        <p className="page-lede">
          Inkmark works best when clips flow in automatically. Pick how you read — each option lands
          clips and highlights straight in your Library.
        </p>
      </header>

      {/* Token — the shared prerequisite for the AI-host and API options. */}
      <section className="connect-card connect-card--token" aria-labelledby="connect-token-heading">
        <div className="connect-card-head">
          <h2 id="connect-token-heading" className="connect-card-title">
            Your access token
          </h2>
          <p className="connect-card-desc">
            The AI-host and API options authenticate with a personal access token. The browser
            extension doesn’t need one — skip this if that’s all you want.
          </p>
        </div>

        {!canManagePat ? (
          <p className="empty-state empty-state--inline">
            You’re signed in with a token already, so new tokens can’t be minted here. Sign in with
            Google to create one, or manage tokens in <Link to="/settings#tokens">Settings</Link>.
          </p>
        ) : created ? (
          <div className="settings-pat-reveal" role="alert">
            <p className="settings-pat-reveal-title">Copy your token now</p>
            <p className="settings-hint">
              You won’t see it again. It’s already filled into the snippets below.
            </p>
            <pre className="settings-pat-secret">{created.token}</pre>
            <div className="settings-pat-reveal-actions">
              <button type="button" className="btn btn--secondary" onClick={() => void copyToken()}>
                Copy
              </button>
            </div>
          </div>
        ) : (
          <form className="settings-form settings-form--inline" onSubmit={onCreateToken}>
            <div className="settings-field settings-field--grow">
              <label className="settings-label" htmlFor="connect-token-name">
                Token name
              </label>
              <input
                id="connect-token-name"
                className="settings-input"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="e.g. Claude, Codex"
              />
            </div>
            <button
              type="submit"
              className="btn btn--secondary settings-pat-create"
              disabled={creating}
            >
              {creating ? 'Creating…' : 'Create token'}
            </button>
          </form>
        )}
        {error ? <p className="error settings-alert">{error}</p> : null}
      </section>

      <section className="connect-card" aria-labelledby="connect-browser-heading">
        <div className="connect-card-head">
          <h2 id="connect-browser-heading" className="connect-card-title">
            Clip from your browser
          </h2>
          <p className="connect-card-desc">
            The Chrome extension adds a one-click clip button and lets you highlight any page.
          </p>
        </div>
        <ol className="connect-steps">
          <li>
            Grab the{' '}
            <a
              href="https://github.com/whovivekshukla/inkmark/tree/main/packages/extension"
              target="_blank"
              rel="noopener noreferrer"
            >
              extension package on GitHub
            </a>{' '}
            and build it (it isn’t on the Chrome Web Store yet).
          </li>
          <li>
            Open <code>chrome://extensions</code>, turn on Developer mode, and load the built folder
            unpacked.
          </li>
        </ol>
      </section>

      <section className="connect-card" aria-labelledby="connect-ai-heading">
        <div className="connect-card-head">
          <h2 id="connect-ai-heading" className="connect-card-title">
            Clip from an AI chat
          </h2>
          <p className="connect-card-desc">
            Inkmark hosts a remote MCP server at <code>{url}</code> — no install. Connect it, then
            ask your assistant to clip articles or save highlights mid-conversation.
          </p>
        </div>

        <p className="connect-note">
          {created ? (
            'Snippets below are filled with the token you just created.'
          ) : (
            <>
              Replace <code>{TOKEN_PLACEHOLDER}</code> with your token. Append{' '}
              <code>?source=CLAUDE</code> to the URL to tag where clips came from.
            </>
          )}
        </p>

        <div className="connect-host">
          <span className="connect-host-label">Connect by URL (recommended)</span>
          <p className="connect-host-hint">
            For hosts with native remote-MCP support — add to their MCP config.
          </p>
          <CopyBlock ariaLabel="Remote MCP URL config" text={mcpUrlConfig(url, activeToken)} />
        </div>

        <div className="connect-host">
          <span className="connect-host-label">Claude Code</span>
          <p className="connect-host-hint">Run this one-liner in your terminal.</p>
          <CopyBlock ariaLabel="Claude Code command" text={claudeCodeHttpCommand(url, activeToken)} />
        </div>

        <div className="connect-host">
          <span className="connect-host-label">Other hosts (via mcp-remote)</span>
          <p className="connect-host-hint">
            For Claude Desktop, Codex, and others that don’t speak remote MCP yet — this bridges over
            stdio. Restart the host after adding it.
          </p>
          <CopyBlock ariaLabel="mcp-remote config" text={mcpRemoteConfig(url, activeToken)} />
        </div>
      </section>

      <section className="connect-card" aria-labelledby="connect-api-heading">
        <div className="connect-card-head">
          <h2 id="connect-api-heading" className="connect-card-title">
            Clip programmatically
          </h2>
          <p className="connect-card-desc">
            Read your library from your own scripts — authenticate with a <code>Bearer</code> token
            and GET the clips endpoint.
          </p>
        </div>
        <CopyBlock
          ariaLabel="curl example"
          text={[
            `curl ${host}/api/v1/clips \\`,
            `  -H "Authorization: Bearer ${activeToken}"`,
          ].join('\n')}
        />
      </section>
    </div>
  )
}
