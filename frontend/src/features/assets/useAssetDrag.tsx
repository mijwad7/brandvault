import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'

export type AssetDrag = {
  assetId: string
  name: string
  pointerId: number
  x: number
  y: number
}

const ROOT_KEY = 'root'

export function useAssetDrag(onDrop: (assetId: string, folderId: string | null) => void) {
  const [drag, setDrag] = useState<AssetDrag | null>(null)
  const [overKey, setOverKey] = useState<string | null>(null)
  const dragRef = useRef<AssetDrag | null>(null)
  const overRef = useRef<string | null>(null)
  const onDropRef = useRef(onDrop)
  onDropRef.current = onDrop
  const dragging = drag !== null

  useEffect(() => {
    function onMove(event: PointerEvent) {
      const current = dragRef.current
      if (!current || event.pointerId !== current.pointerId) {
        return
      }
      const next = { ...current, x: event.clientX, y: event.clientY }
      dragRef.current = next
      setDrag(next)
      const zone = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-drop-folder]')
      const key = zone?.getAttribute('data-drop-folder') ?? null
      if (key !== overRef.current) {
        overRef.current = key
        setOverKey(key)
      }
    }

    function onEnd(event: PointerEvent) {
      const current = dragRef.current
      if (!current || event.pointerId !== current.pointerId) {
        return
      }
      const key = overRef.current
      dragRef.current = null
      overRef.current = null
      setDrag(null)
      setOverKey(null)
      if (!key) {
        return
      }
      onDropRef.current(current.assetId, key === ROOT_KEY ? null : key)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
    }
  }, [])

  useEffect(() => {
    if (!dragging) {
      return
    }
    const previousUserSelect = document.body.style.userSelect
    const previousCursor = document.body.style.cursor
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
    return () => {
      document.body.style.userSelect = previousUserSelect
      document.body.style.cursor = previousCursor
    }
  }, [dragging])

  function beginDrag(event: ReactPointerEvent<HTMLElement>, asset: { id: string; name: string }) {
    if (event.button !== 0) {
      return
    }
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const next: AssetDrag = {
      assetId: asset.id,
      name: asset.name,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    }
    dragRef.current = next
    overRef.current = null
    setOverKey(null)
    setDrag(next)
  }

  return { drag, overKey, beginDrag }
}

export function AssetDragGhost({ drag, label }: { drag: AssetDrag | null; label: string }) {
  if (!drag) {
    return null
  }
  return createPortal(
    <div
      className="pointer-events-none fixed z-80 max-w-56 -translate-x-1/2 -translate-y-12 truncate rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium text-ink shadow-lg"
      style={{ left: drag.x, top: drag.y }}
    >
      {label}
    </div>,
    document.body,
  )
}
