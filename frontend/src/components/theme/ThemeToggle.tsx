import { cn } from '../../lib/cn.ts'
import { Icon } from '../ui/icons.tsx'
import { useTheme } from './useTheme.ts'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className={cn(
        'grid size-11 place-items-center rounded-xl border border-line bg-surface text-ink hover:bg-muted-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        className,
      )}
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Icon name={isDark ? 'sun' : 'moon'} />
    </button>
  )
}
