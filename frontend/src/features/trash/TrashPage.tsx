import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { EmptyState } from '../../components/ui/EmptyState.tsx'
import { FormAlert } from '../../components/ui/Field.tsx'
import { Icon, type IconName } from '../../components/ui/icons.tsx'
import { Skeleton } from '../../components/ui/Skeleton.tsx'
import { useToast } from '../../components/ui/useToast.ts'
import { useApi } from '../../hooks/useApi.ts'
import { getApiErrorMessage, isInlineApiError, readApiErrors } from '../../lib/api.ts'
import type { Asset, AssetType } from '../../types/index.ts'

const typeLabels: Record<AssetType, string> = {
  image: 'Image',
  video: 'Video',
  logo: 'Logo',
  document: 'Document',
  font: 'Font',
}

const typeIcons: Record<AssetType, IconName> = {
  image: 'image',
  video: 'film',
  logo: 'image',
  document: 'file',
  font: 'type',
}

function formatWhen(iso: string | null): string {
  if (!iso) {
    return ''
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function TrashPage() {
  const api = useApi()
  const toast = useToast()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await api.get<Asset[]>('/assets?trashed=true')
        if (!cancelled) {
          setAssets(data)
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

  async function restore(asset: Asset) {
    setRestoringId(asset.id)
    setActionError('')
    try {
      await api.post(`/assets/${asset.id}/restore`)
    } catch (caught) {
      const parsed = readApiErrors(caught)
      setActionError(parsed.form || getApiErrorMessage(caught))
      if (!isInlineApiError(caught)) {
        toast.error(parsed.form || 'Could not restore that asset.')
      }
      setRestoringId(null)
      return
    }
    toast.success(`Restored “${asset.name}”.`)
    setAssets((current) => current.filter((item) => item.id !== asset.id))
    setRestoringId(null)
  }

  return (
    <section>
      <PageHeader
        title="Trash"
        description="Soft-deleted assets stay here until you restore them to the library."
      />

      {loading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : error ? (
        <div className="mt-6">
          <EmptyState
            tone="error"
            title="Couldn’t load trash"
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
      ) : (
        <>
          <div className="mt-4">
            <FormAlert message={actionError} />
          </div>
          {assets.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="Trash is empty"
                body="Assets you move out of the library will wait here."
                action={
                  <Link
                    to="/library"
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-4 text-sm font-medium text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    Back to library
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {assets.map((asset) => {
                const when = formatWhen(asset.deleted_at)
                return (
                  <li
                    key={asset.id}
                    className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted-surface text-muted">
                        <Icon name={typeIcons[asset.type]} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{asset.name}</p>
                        <p className="text-sm text-muted">
                          {typeLabels[asset.type]}
                          {when ? ` · Trashed ${when}` : ''}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      className="w-full sm:w-auto"
                      disabled={restoringId === asset.id}
                      onClick={() => {
                        void restore(asset)
                      }}
                    >
                      <Icon name="undo" />
                      {restoringId === asset.id ? 'Restoring…' : 'Restore'}
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
