import { useState } from 'react'

interface CopyBlockProps {
  text: string
  ariaLabel?: string
}

/** A code block styled like the token reveal, with a copy-to-clipboard button. */
export function CopyBlock({ text, ariaLabel }: CopyBlockProps): React.ReactElement {
  const [copied, setCopied] = useState(false)

  const onCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable — user can select the text manually */
    }
  }

  return (
    <div className="copy-block">
      <button
        type="button"
        className="btn btn--secondary copy-block-btn"
        onClick={() => void onCopy()}
        aria-label={ariaLabel ? `Copy ${ariaLabel}` : 'Copy to clipboard'}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre className="settings-pat-secret copy-block-pre">{text}</pre>
    </div>
  )
}
