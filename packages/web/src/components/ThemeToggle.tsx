import { useTheme } from '../theme/ThemeContext'

export function ThemeToggle({
  className,
  variant = 'default',
}: {
  className?: string
  variant?: 'default' | 'nav'
}): React.ReactElement {
  const { theme, toggleTheme } = useTheme()
  const extra = variant === 'nav' ? 'theme-toggle--nav' : ''

  return (
    <button
      type="button"
      className={['theme-toggle', extra, className].filter(Boolean).join(' ')}
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  )
}
