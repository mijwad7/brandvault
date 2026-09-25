import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'
import { Icon } from './icons.tsx'
import { ToastContext } from './useToast.ts'

type ToastTone = 'success' | 'error'

type ToastItem = {
  id: number
  tone: ToastTone
  message: string
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = idRef.current + 1
      idRef.current = id
      setItems((current) => [...current, { id, tone, message }].slice(-4))
      window.setTimeout(() => dismiss(id), 4600)
    },
    [dismiss],
  )

  const value = useMemo(
    () => ({
      success: (message: string) => push('success', message),
      error: (message: string) => push('error', message),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6">
        {items.map((item) => (
          <div
            key={item.id}
            role={item.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-surface px-3 py-3 shadow-xl',
              item.tone === 'error' ? 'border-l-4 border-l-danger' : 'border-l-4 border-l-ok',
            )}
          >
            <Icon
              name={item.tone === 'error' ? 'alert' : 'check'}
              className={item.tone === 'error' ? 'mt-0.5 text-danger' : 'mt-0.5 text-ok'}
            />
            <p className="min-w-0 flex-1 text-sm leading-relaxed text-ink">{item.message}</p>
            <button
              type="button"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-muted-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-label="Dismiss notification"
              onClick={() => dismiss(item.id)}
            >
              <Icon name="x" className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
