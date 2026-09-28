import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { EmptyState } from '../../components/ui/EmptyState.tsx'
import { FormAlert } from '../../components/ui/Field.tsx'
import { Icon, type IconName } from '../../components/ui/icons.tsx'
import { Skeleton } from '../../components/ui/Skeleton.tsx'
import { useToast } from '../../components/ui/useToast.ts'
import { useApi } from '../../hooks/useApi.ts'
import { getApiErrorMessage, isInlineApiError, readApiErrors } from '../../lib/api.ts'
import { removeStorageObject } from '../../lib/storage.ts'
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
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Asset | null>(null)
  const [deleteError, setDeleteError] = useState('')
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
    setPendingId(asset.id)
    setActionError('')
    try {
      await api.post(`/assets/${asset.id}/restore`)
    } catch (caught) {
      const parsed = readApiErrors(caught)
      setActionError(parsed.form || getApiErrorMessage(caught))
      if (!isInlineApiError(caught)) {
        toast.error(parsed.form || 'Could not restore that asset.')
      }
      setPendingId(null)
      return
    }
    toast.success(`Restored “${asset.name}”.`)
    setAssets((current) => current.filter((item) => item.id !== asset.id))
    setPendingId(null)
  }

  async function deleteForever(asset: Asset) {
    setPendingId(asset.id)
    setDeleteError('')
    try {
      await api.delete(`/assets/${asset.id}`)
    } catch (caught) {
      const parsed = readApiErrors(caught)
      setDeleteError(parsed.form || getApiErrorMessage(caught))
      if (!isInlineApiError(caught)) {
        toast.error(parsed.form || 'Could not delete that asset.')
      }
      setPendingId(null)
      return
    }
    if (asset.storage_bucket && asset.storage_path) {
      try {
        await removeStorageObject(asset.storage_bucket, asset.storage_path)
      } catch {
        toast.error(`Deleted “${asset.name}”. The stored file could not be removed.`)
        setAssets((current) => current.filter((item) => item.id !== asset.id))
        setPendingDelete(null)
        setPendingId(null)
        return
      }
    }
    toast.success(`Deleted “${asset.name}”.`)
    setAssets((current) => current.filter((item) => item.id !== asset.id))
    setPendingDelete(null)
    setPendingId(null)
  }

  return (
    <section>
      <PageHeader
        title="Trash"
        description="Restore an item, or delete it for good."
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
                body="When you remove something from the library, it will wait here."
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
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                      <Button
                        variant="secondary"
                        className="w-full sm:w-auto"
                        disabled={pendingId !== null}
                        onClick={() => {
                          void restore(asset)
                        }}
                      >
                        <Icon name="undo" />
                        {pendingId === asset.id && pendingDelete === null ? 'Restoring…' : 'Restore'}
                      </Button>
                      <Button
                        variant="danger"
                        className="w-full sm:w-auto"
                        disabled={pendingId !== null}
                        onClick={() => {
                          setDeleteError('')
                          setPendingDelete(asset)
                        }}
                      >
                        <Icon name="trash" />
                        Delete
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete ? `Delete “${pendingDelete.name}” forever?` : 'Delete asset'}
        description="This removes it from Trash. You can’t restore it."
        confirmLabel="Delete forever"
        pending={pendingId !== null}
        error={deleteError}
        onConfirm={() => {
          if (pendingDelete) {
            void deleteForever(pendingDelete)
          }
        }}
        onClose={() => {
          if (pendingId === null) {
            setPendingDelete(null)
            setDeleteError('')
          }
        }}
      />
    </section>
  )
}
