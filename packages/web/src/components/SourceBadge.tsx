import type { ClipSource } from '@inkmark/shared'

const LABELS: Record<ClipSource, string> = {
  WEB: 'web',
  EXTENSION: 'extension',
  MCP: 'mcp',
  CLAUDE: 'claude',
  CHATGPT: 'chatgpt',
  CODEX: 'codex',
  API: 'api',
}

interface SourceBadgeProps {
  source: ClipSource
}

export function SourceBadge({ source }: SourceBadgeProps): React.ReactElement {
  const label = LABELS[source] ?? source.toLowerCase()
  return (
    <span className="source-badge" title={`Saved via ${label}`}>
      via {label}
    </span>
  )
}
