import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn.ts'
import { Icon } from './icons.tsx'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (node) => !node.hasAttribute('disabled') && node.tabIndex !== -1,
  )
}

type DialogProps = {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  variant?: 'dialog' | 'sheet'
}

export function Dialog({
  open,
  title,
  description,
  onClose,
  children,
  variant = 'dialog',
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) {
      return
    }

    const previouslyFocused = document.activeElement
    const panel = panelRef.current
    const root = document.getElementById('root')
    root?.setAttribute('inert', '')
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const preferred = panel?.querySelector<HTMLElement>('[data-autofocus]')
    const items = panel ? focusable(panel) : []
    const initial =
      preferred ?? items.find((node) => !node.hasAttribute('data-dialog-close')) ?? panel
    initial?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) {
        return
      }
      const nodes = focusable(panelRef.current)
      if (nodes.length === 0) {
        event.preventDefault()
        panelRef.current.focus()
        return
      }
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement
      const inside =
        active instanceof Node && panelRef.current.contains(active) && active !== panelRef.current
      if (!inside) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
        return
      }
      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      root?.removeAttribute('inert')
      document.body.style.overflow = previousOverflow
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus()
      }
    }
  }, [open])

  if (!open) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-ink/40"
        onClick={() => onCloseRef.current()}
      />
      <div
        className={cn(
          'pointer-events-none relative z-10 flex h-full',
          variant === 'dialog' ? 'items-center justify-center p-4' : 'items-end md:items-stretch md:justify-end',
        )}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
          className={cn(
            'pointer-events-auto flex w-full flex-col bg-surface text-ink shadow-2xl outline-none',
            variant === 'dialog' &&
              'bv-dialog max-h-[min(90svh,40rem)] max-w-md overflow-y-auto rounded-3xl border border-line p-5',
            variant === 'sheet' &&
              'bv-sheet max-h-[100svh] overflow-y-auto rounded-t-3xl border border-line p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:h-svh md:max-h-none md:w-[26rem] md:rounded-none md:border-y-0 md:border-r-0',
          )}
        >
          {variant === 'sheet' ? (
            <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line md:hidden" />
          ) : null}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={titleId} className="font-serif text-2xl tracking-tight text-ink">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-1.5 text-sm leading-relaxed text-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              data-dialog-close=""
              className="grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-muted-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={() => onCloseRef.current()}
              aria-label="Close"
            >
              <Icon name="x" />
            </button>
          </div>
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
