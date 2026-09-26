import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { Dialog } from '../../components/ui/Dialog.tsx'
import { EmptyState } from '../../components/ui/EmptyState.tsx'
import { FormAlert, TextField } from '../../components/ui/Field.tsx'
import { Icon, type IconName } from '../../components/ui/icons.tsx'
import { Skeleton } from '../../components/ui/Skeleton.tsx'
import { useToast } from '../../components/ui/useToast.ts'
import { useApi } from '../../hooks/useApi.ts'
import { getApiErrorMessage, isInlineApiError, readApiErrors } from '../../lib/api.ts'
import { cn } from '../../lib/cn.ts'
import type { Asset, AssetType, Folder } from '../../types/index.ts'
import {
  breadcrumbs,
  childFolders,
  folderDepth,
  folderMap,
  MAX_FOLDER_DEPTH,
} from '../folders/tree.ts'
import { useSearchParams } from 'react-router-dom'
import { TagReviewDialog } from '../ai/TagReviewDialog.tsx'
import type { AISuggestion } from '../ai/types.ts'
import { AssetForm } from './AssetForm.tsx'
import { assetToForm, emptyAssetForm, type AssetFormState } from './assetFormState.ts'

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

function assetsPath(folderId: string | null, search: string, sort: string): string {
  const params = new URLSearchParams()
  if (search.trim()) {
    params.set('search', search.trim())
  } else {
    params.set('folder', folderId ?? 'root')
  }
  if (sort === 'name_asc') {
    params.set('sort', 'name_asc')
  }
  return `/assets?${params.toString()}`
}

type ConfirmTarget =
  | { kind: 'folder'; folder: Folder }
  | { kind: 'asset'; asset: Asset }

export function AssetsPage() {
  const api = useApi()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const folderId = searchParams.get('folder')

  const [folders, setFolders] = useState<Folder[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('updated_desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [folderOpen, setFolderOpen] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [folderError, setFolderError] = useState('')
  const [folderFieldErrors, setFolderFieldErrors] = useState<Record<string, string>>({})
  const [folderSaving, setFolderSaving] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Asset | null>(null)
  const [form, setForm] = useState<AssetFormState>(emptyAssetForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null)
  const [confirmError, setConfirmError] = useState('')
  const [confirmPending, setConfirmPending] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [reviewAsset, setReviewAsset] = useState<Asset | null>(null)
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null)
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewError, setReviewError] = useState('')

  const byId = useMemo(() => folderMap(folders), [folders])
  const currentFolder = folderId ? (byId.get(folderId) ?? null) : null
  const trail = breadcrumbs(folderId, byId)
  const children = childFolders(folders, folderId)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
  const canCreateFolder = folderDepth(currentFolder, byId) < MAX_FOLDER_DEPTH

  async function refreshFolders() {
    setFolders(await api.get<Folder[]>('/folders'))
  }

  async function refreshAssets() {
    setAssets(await api.get<Asset[]>(assetsPath(folderId, search, sort)))
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [folderData, assetData] = await Promise.all([
          api.get<Folder[]>('/folders'),
          api.get<Asset[]>(assetsPath(folderId, search, sort)),
        ])
        if (!cancelled) {
          setFolders(folderData)
          setAssets(assetData)
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
  }, [api, folderId, search, sort, reloadKey])

  function openFolder(id: string | null) {
    if (id) {
      setSearchParams({ folder: id })
    } else {
      setSearchParams({})
    }
    setSearch('')
    setSearchInput('')
  }

  function closeForm() {
    if (saving) {
      return
    }
    setFormOpen(false)
    setEditing(null)
    setFormError('')
    setFieldErrors({})
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyAssetForm, folder: folderId ?? '' })
    setFormError('')
    setFieldErrors({})
    setFormOpen(true)
  }

  function openEdit(asset: Asset) {
    setEditing(asset)
    setForm(assetToForm(asset))
    setFormError('')
    setFieldErrors({})
    setFormOpen(true)
  }

  async function createFolder() {
    const name = folderName.trim()
    if (!name) {
      setFolderError('')
      setFolderFieldErrors({ name: 'Enter a folder name.' })
      return
    }
    setFolderSaving(true)
    setFolderError('')
    setFolderFieldErrors({})
    try {
      await api.post<Folder>('/folders', { name, parent: folderId })
    } catch (caught) {
      const parsed = readApiErrors(caught)
      setFolderFieldErrors(parsed.fields)
      setFolderError(parsed.form)
      if (!isInlineApiError(caught)) {
        toast.error(parsed.form || 'Could not create the folder.')
      }
      setFolderSaving(false)
      return
    }
    toast.success(`Created folder “${name}”.`)
    setFolderName('')
    setFolderOpen(false)
    setFolderSaving(false)
    try {
      await refreshFolders()
    } catch (caught) {
      toast.error(getApiErrorMessage(caught))
    }
  }

  async function saveAsset() {
    setSaving(true)
    setFormError('')
    setFieldErrors({})
    const payload = {
      name: form.name.trim(),
      type: form.type,
      url: form.url.trim(),
      folder: form.folder || null,
    }
    try {
      if (editing) {
        await api.patch<Asset>(`/assets/${editing.id}`, payload)
      } else {
        await api.post<Asset>('/assets', payload)
      }
    } catch (caught) {
      const parsed = readApiErrors(caught)
      setFieldErrors(parsed.fields)
      setFormError(parsed.form)
      if (!isInlineApiError(caught)) {
        toast.error(parsed.form || 'Could not save the asset.')
      }
      setSaving(false)
      return
    }
    toast.success(editing ? `Saved “${payload.name}”.` : `Added “${payload.name}”.`)
    setSaving(false)
    setFormOpen(false)
    setEditing(null)
    try {
      await refreshAssets()
    } catch (caught) {
      toast.error(getApiErrorMessage(caught))
    }
  }

  function askConfirm(target: ConfirmTarget) {
    setConfirmError('')
    setConfirm(target)
  }

  async function runConfirm() {
    if (!confirm) {
      return
    }
    setConfirmPending(true)
    setConfirmError('')
    try {
      if (confirm.kind === 'folder') {
        await api.delete(`/folders/${confirm.folder.id}`)
      } else {
        await api.post(`/assets/${confirm.asset.id}/trash`)
      }
    } catch (caught) {
      const parsed = readApiErrors(caught)
      setConfirmError(parsed.form || getApiErrorMessage(caught))
      if (!isInlineApiError(caught)) {
        toast.error(parsed.form || 'That action failed.')
      }
      setConfirmPending(false)
      return
    }
    const message =
      confirm.kind === 'folder'
        ? `Deleted folder “${confirm.folder.name}”.`
        : `Moved “${confirm.asset.name}” to trash.`
    const kind = confirm.kind
    toast.success(message)
    setConfirm(null)
    setConfirmPending(false)
    try {
      if (kind === 'folder') {
        await refreshFolders()
      } else {
        await refreshAssets()
      }
    } catch (caught) {
      toast.error(getApiErrorMessage(caught))
    }
  }

  function closeReview() {
    if (reviewSaving) {
      return
    }
    setReviewAsset(null)
    setSuggestion(null)
    setReviewError('')
  }

  async function generateTags(asset: Asset) {
    setGeneratingId(asset.id)
    setReviewError('')
    try {
      const result = await api.post<AISuggestion>(`/assets/${asset.id}/ai-tags`)
      setReviewAsset(asset)
      setSuggestion(result)
    } catch (caught) {
      toast.error(getApiErrorMessage(caught))
    } finally {
      setGeneratingId(null)
    }
  }

  async function saveSuggestion(next: AISuggestion) {
    if (!reviewAsset) {
      return
    }
    setReviewSaving(true)
    setReviewError('')
    try {
      const saved = await api.patch<Asset>(`/assets/${reviewAsset.id}/ai-tags/save`, next)
      setAssets((current) => current.map((item) => (item.id === saved.id ? saved : item)))
    } catch (caught) {
      const parsed = readApiErrors(caught)
      setReviewError(parsed.form || getApiErrorMessage(caught))
      if (!isInlineApiError(caught)) {
        toast.error(parsed.form || 'Could not save the tags.')
      }
      setReviewSaving(false)
      return
    }
    toast.success(`Saved tags for “${reviewAsset.name}”.`)
    setReviewSaving(false)
    setReviewAsset(null)
    setSuggestion(null)
  }

  const title = search ? 'Search' : (currentFolder?.name ?? 'Library')
  const missingFolder = Boolean(folderId) && !loading && !currentFolder && !search

  return (
    <section>
      <PageHeader
        title={title}
        description={
          search
            ? 'Results come from the whole workspace, not just this folder.'
            : 'Folders and files for this workspace. Assets are stored as HTTPS links.'
        }
        actions={
          <Button className="w-full sm:w-auto" onClick={openCreate}>
            <Icon name="plus" />
            Add asset
          </Button>
        }
      />

      <nav aria-label="Folder path" className="mt-4 flex items-center gap-1 overflow-x-auto text-sm">
        <button
          type="button"
          className={cn(
            'shrink-0 rounded-lg px-1.5 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
            folderId ? 'text-muted hover:text-ink' : 'font-medium text-ink',
          )}
          onClick={() => openFolder(null)}
        >
          Library
        </button>
        {trail.map((folder, index) => (
          <span key={folder.id} className="flex shrink-0 items-center gap-1">
            <Icon name="chevron" className="size-4 text-faint" />
            <button
              type="button"
              className="rounded-lg px-1.5 py-1 font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-current={index === trail.length - 1 ? 'page' : undefined}
              onClick={() => openFolder(folder.id)}
            >
              {folder.name}
            </button>
          </span>
        ))}
      </nav>

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault()
          setSearch(searchInput.trim())
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
          <input
            className="h-11 w-full rounded-xl border border-line bg-surface pr-3 pl-10 text-sm text-ink outline-none placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name"
            aria-label="Search assets"
          />
        </div>
        <div className="flex gap-2">
          <select
            className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex-none"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            aria-label="Sort assets"
          >
            <option value="updated_desc">Newest updated</option>
            <option value="name_asc">Name A–Z</option>
          </select>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </div>
      </form>

      {search ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-muted-surface px-3 py-2 text-sm">
          <p className="min-w-0 text-ink">
            Searching the whole library for “{search}”.
          </p>
          <button
            type="button"
            className="shrink-0 rounded-lg px-2 py-1 font-medium text-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onClick={() => {
              setSearch('')
              setSearchInput('')
            }}
          >
            Clear
          </button>
        </div>
      ) : null}

      {loading ? (
        <LibrarySkeleton />
      ) : error ? (
        <div className="mt-6">
          <EmptyState
            tone="error"
            title="Couldn’t load the library"
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
        <div className="mt-6 space-y-8">
          {search ? null : missingFolder ? (
            <EmptyState
              title="Folder not found"
              body="That folder is not in this workspace."
              action={
                <Button variant="secondary" onClick={() => openFolder(null)}>
                  Back to library
                </Button>
              }
            />
          ) : (
            <section>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-serif text-2xl tracking-tight">Folders</h2>
                {canCreateFolder ? (
                  <Button
                    variant="secondary"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setFolderName('')
                      setFolderError('')
                      setFolderFieldErrors({})
                      setFolderOpen(true)
                    }}
                  >
                    <Icon name="plus" />
                    New folder
                  </Button>
                ) : (
                  <p className="text-sm text-muted">Folders can go three levels deep. This one is full.</p>
                )}
              </div>
              {children.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No folders here.</p>
              ) : (
                <ul className="mt-3 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3">
                  {children.map((folder) => (
                    <li key={folder.id}>
                      <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface p-2">
                        <button
                          type="button"
                          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                          onClick={() => openFolder(folder.id)}
                        >
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted-surface text-ink">
                            <Icon name="folder" />
                          </span>
                          <span className="truncate font-medium">{folder.name}</span>
                        </button>
                        <button
                          type="button"
                          className="grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                          aria-label={`Delete folder ${folder.name}`}
                          onClick={() => askConfirm({ kind: 'folder', folder })}
                        >
                          <Icon name="trash" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {missingFolder ? null : (
          <section aria-live="polite">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-serif text-2xl tracking-tight">Assets</h2>
              <p className="text-sm text-muted">
                {assets.length} {assets.length === 1 ? 'asset' : 'assets'}
              </p>
            </div>
            {assets.length === 0 ? (
              <div className="mt-3">
                <EmptyState
                  title={search ? 'No matches' : 'Nothing in this folder'}
                  body={
                    search
                      ? `Nothing in the library is named like “${search}”.`
                      : 'Add an HTTPS asset, or open a folder that already has some.'
                  }
                  action={
                    search ? (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSearch('')
                          setSearchInput('')
                        }}
                      >
                        Clear search
                      </Button>
                    ) : (
                      <Button onClick={openCreate}>
                        <Icon name="plus" />
                        Add asset
                      </Button>
                    )
                  }
                />
              </div>
            ) : (
              <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {assets.map((asset) => (
                  <li key={asset.id}>
                    <article className="overflow-hidden rounded-2xl border border-line bg-surface">
                      <AssetVisual asset={asset} />
                      <div className="space-y-3 p-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-medium text-ink">{asset.name}</h3>
                          <p className="mt-0.5 text-xs font-medium tracking-wide text-muted uppercase">
                            {typeLabels[asset.type]}
                          </p>
                        </div>
                        {asset.tags.length > 0 ? (
                          <ul className="flex flex-wrap gap-1">
                            {asset.tags.map((tag) => (
                              <li
                                key={tag}
                                className="rounded-full bg-muted-surface px-2 py-0.5 text-xs text-ink"
                              >
                                {tag}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {asset.description ? (
                          <p className="line-clamp-2 text-sm text-muted">{asset.description}</p>
                        ) : null}
                        {asset.usage_suggestion ? (
                          <p className="line-clamp-2 text-sm text-ink">
                            <span className="font-medium">Use: </span>
                            {asset.usage_suggestion}
                          </p>
                        ) : null}
                        {asset.url ? (
                          <a
                            href={asset.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-muted underline-offset-2 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                          >
                            Open link
                            <Icon name="external" className="size-3.5" />
                          </a>
                        ) : null}
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          disabled={generatingId === asset.id}
                          onClick={() => {
                            void generateTags(asset)
                          }}
                        >
                          {generatingId === asset.id ? 'Generating…' : 'Generate tags'}
                        </Button>
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm" className="flex-1" onClick={() => openEdit(asset)}>
                            Edit
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                            onClick={() => askConfirm({ kind: 'asset', asset })}
                          >
                            Trash
                          </Button>
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </section>
          )}
        </div>
      )}

      <Dialog
        open={folderOpen}
        title="New folder"
        description={
          currentFolder
            ? `Inside “${currentFolder.name}”. Names must be unique among siblings.`
            : 'At the library root. Names must be unique among siblings.'
        }
        onClose={() => {
          if (!folderSaving) {
            setFolderOpen(false)
          }
        }}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void createFolder()
          }}
        >
          <TextField
            label="Folder name"
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            error={folderFieldErrors.name}
            data-autofocus=""
            required
          />
          <FormAlert message={folderError} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" className="w-full" disabled={folderSaving}>
              {folderSaving ? 'Creating…' : 'Create folder'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={folderSaving}
              onClick={() => setFolderOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={formOpen}
        variant="sheet"
        title={editing ? 'Edit asset' : 'Add asset'}
        description={editing ? 'Update the name, type, link, or folder.' : 'Add an asset with an HTTPS link.'}
        onClose={closeForm}
      >
        <AssetForm
          values={form}
          folders={folders}
          saving={saving}
          error={formError}
          fieldErrors={fieldErrors}
          submitLabel={editing ? 'Save asset' : 'Create asset'}
          onChange={setForm}
          onSubmit={() => {
            void saveAsset()
          }}
          onCancel={closeForm}
        />
      </Dialog>

      <TagReviewDialog
        asset={reviewAsset}
        suggestion={suggestion}
        open={reviewAsset !== null && suggestion !== null}
        saving={reviewSaving}
        error={reviewError}
        onClose={closeReview}
        onSave={(next) => {
          void saveSuggestion(next)
        }}
      />

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm?.kind === 'folder'
            ? `Delete “${confirm.folder.name}”?`
            : confirm?.kind === 'asset'
              ? `Move “${confirm.asset.name}” to trash?`
              : 'Confirm'
        }
        description={
          confirm?.kind === 'folder'
            ? 'This only works when the folder is empty. Move assets and subfolders out first.'
            : 'You can restore it later from Trash.'
        }
        confirmLabel={confirm?.kind === 'folder' ? 'Delete folder' : 'Move to trash'}
        pending={confirmPending}
        error={confirmError}
        onConfirm={() => {
          void runConfirm()
        }}
        onClose={() => {
          if (!confirmPending) {
            setConfirm(null)
          }
        }}
      />
    </section>
  )
}

function LibrarySkeleton() {
  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </div>
  )
}

function AssetVisual({ asset }: { asset: Asset }) {
  const [failed, setFailed] = useState(false)
  const showImage = (asset.type === 'image' || asset.type === 'logo') && Boolean(asset.url) && !failed

  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-muted-surface">
      {showImage ? (
        <img
          src={asset.url}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="grid h-full place-items-center text-faint">
          <Icon name={typeIcons[asset.type]} className="size-8" />
        </div>
      )}
      <span className="absolute top-2 left-2 rounded-full bg-surface/90 px-2 py-0.5 text-xs font-medium text-ink">
        {typeLabels[asset.type]}
      </span>
    </div>
  )
}
