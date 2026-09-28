import { useEffect, useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { EmptyState } from '../../components/ui/EmptyState.tsx'
import { Skeleton } from '../../components/ui/Skeleton.tsx'
import { useApi } from '../../hooks/useApi.ts'
import { getApiErrorMessage } from '../../lib/api.ts'
import type { Activity } from '../../types/index.ts'

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function ActivityPage() {
  const api = useApi()
  const [entries, setEntries] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await api.get<Activity[]>('/activity')
        if (!cancelled) {
          setEntries(data)
        }
      } catch (caught) {
        if (!cancelled) {
          setError(getApiErrorMessage(caught))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [api, reloadKey])

  return (
    <section>
      <PageHeader
        title="Activity"
        description="A history of what you’ve added, changed, and removed."
      />

      {loading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : error ? (
        <div className="mt-6">
          <EmptyState
            tone="error"
            title="Couldn’t load activity"
            body={error}
            action={
              <Button
                onClick={() => {
                  setReloadKey((current) => current + 1)
                }}
              >
                Try again
              </Button>
            }
          />
        </div>
      ) : entries.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No activity yet"
            body="New folders, edits, and items you remove will show up here."
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-2xl border border-line bg-surface px-4 py-3">
              <p className="text-sm text-ink">{entry.summary}</p>
              <p className="mt-1 text-xs text-muted">{formatWhen(entry.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
