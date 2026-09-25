import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  body: string
  action?: ReactNode
  tone?: 'neutral' | 'error'
}

export function EmptyState({ title, body, action, tone = 'neutral' }: EmptyStateProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className="rounded-3xl border border-dashed border-line bg-surface px-5 py-10 text-center"
    >
      <h2 className="font-serif text-2xl tracking-tight text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}
