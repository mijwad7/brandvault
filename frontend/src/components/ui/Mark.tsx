import { cn } from '../../lib/cn.ts'

export function Mark({ color, ink }: { color?: string | null; ink?: string | null }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-xl text-sm font-semibold',
        color ? '' : 'bg-accent text-accent-ink',
      )}
      style={color ? { backgroundColor: color, color: ink ?? '#F6F1E7' } : undefined}
    >
      B
    </span>
  )
}
