import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getApiErrorMessage } from '../../lib/api.ts'
import { useApi } from '../../hooks/useApi.ts'
import type { Asset, Folder } from '../../types/index.ts'
import {
  breadcrumbs,
  childFolders,
  folderDepth,
  folderMap,
  MAX_FOLDER_DEPTH,
} from '../folders/tree.ts'
import {
  AssetForm,
  assetToForm,
  emptyAssetForm,
  type AssetFormState,
} from './AssetForm.tsx'

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

export function AssetsPage() {
  const api = useApi()
  const [searchParams, setSearchParams] = useSearchParams()
  const folderId = searchParams.get('folder')

  const [folders, setFolders] = useState<Folder[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('updated_desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [folderName, setFolderName] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Asset | null>(null)
  const [form, setForm] = useState<AssetFormState>(emptyAssetForm)
  const [saving, setSaving] = useState(false)

  const byId = useMemo(() => folderMap(folders), [folders])
  const currentFolder = folderId ? (byId.get(folderId) ?? null) : null
  const trail = breadcrumbs(folderId, byId)
  const children = childFolders(folders, folderId)
  const canCreateFolder = folderDepth(currentFolder, byId) < MAX_FOLDER_DEPTH

  async function refreshFolders() {
    const data = await api.get<Folder[]>('/folders')
    setFolders(data)
  }

  async function refreshAssets() {
    const data = await api.get<Asset[]>(assetsPath(folderId, search, sort))
    setAssets(data)
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
  }, [api, folderId, search, sort])

  function openFolder(id: string | null) {
    if (id) {
      setSearchParams({ folder: id })
    } else {
      setSearchParams({})
    }
    setSearch('')
    setSearchInput('')
  }

  async function createFolder() {
    const name = folderName.trim()
    if (!name) {
      return
    }
    setError('')
    try {
      await api.post<Folder>('/folders', {
        name,
        parent: folderId,
      })
      setFolderName('')
      await refreshFolders()
    } catch (caught) {
      setError(getApiErrorMessage(caught))
    }
  }

  async function removeFolder(folder: Folder) {
    if (!window.confirm(`Delete folder “${folder.name}”? It must be empty.`)) {
      return
    }
    setError('')
    try {
      await api.delete(`/folders/${folder.id}`)
      await refreshFolders()
    } catch (caught) {
      setError(getApiErrorMessage(caught))
    }
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyAssetForm, folder: folderId ?? '' })
    setFormOpen(true)
  }

  function openEdit(asset: Asset) {
    setEditing(asset)
    setForm(assetToForm(asset))
    setFormOpen(true)
  }

  async function saveAsset() {
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        url: form.url.trim(),
        folder: form.folder || null,
      }
      if (editing) {
        await api.patch<Asset>(`/assets/${editing.id}`, payload)
      } else {
        await api.post<Asset>('/assets', payload)
      }
      setFormOpen(false)
      setEditing(null)
      await refreshAssets()
    } catch (caught) {
      setError(getApiErrorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  async function trashAsset(asset: Asset) {
    if (!window.confirm(`Move “${asset.name}” to trash?`)) {
      return
    }
    setError('')
    try {
      await api.post(`/assets/${asset.id}/trash`)
      await refreshAssets()
    } catch (caught) {
      setError(getApiErrorMessage(caught))
    }
  }

  return (
    <section className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Asset library</h1>
          <nav className="mt-1 flex flex-wrap gap-1 text-sm text-slate-600">
            <button className="hover:underline" type="button" onClick={() => openFolder(null)}>
              Library
            </button>
            {trail.map((folder) => (
              <span key={folder.id} className="flex gap-1">
                <span>/</span>
                <button
                  className="hover:underline"
                  type="button"
                  onClick={() => openFolder(folder.id)}
                >
                  {folder.name}
                </button>
              </span>
            ))}
          </nav>
        </div>
        <button
          className="rounded bg-slate-900 px-3 py-2 text-sm text-white"
          type="button"
          onClick={openCreate}
        >
          Add asset
        </button>
      </div>

      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          setSearch(searchInput)
        }}
      >
        <input
          className="min-w-56 flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by name"
          aria-label="Search assets"
        />
        <select
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          aria-label="Sort assets"
        >
          <option value="updated_desc">Newest updated</option>
          <option value="name_asc">Name A–Z</option>
        </select>
        <button className="rounded border border-slate-300 px-3 py-2 text-sm" type="submit">
          Search
        </button>
      </form>

      {search ? (
        <p className="mt-2 text-sm text-slate-500">
          Showing workspace results for “{search}”.{' '}
          <button className="underline" type="button" onClick={() => { setSearch(''); setSearchInput('') }}>
            Clear
          </button>
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {formOpen ? (
        <div className="mt-4 max-w-xl">
          <AssetForm
            title={editing ? 'Edit asset' : 'Add asset'}
            values={form}
            folders={folders}
            saving={saving}
            submitLabel={editing ? 'Save asset' : 'Create asset'}
            onChange={setForm}
            onSubmit={() => {
              void saveAsset()
            }}
            onCancel={() => {
              setFormOpen(false)
              setEditing(null)
            }}
          />
        </div>
      ) : null}

      <div className="mt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-medium">Folders</h2>
          {canCreateFolder ? (
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                void createFolder()
              }}
            >
              <input
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                placeholder="New folder name"
                aria-label="New folder name"
              />
              <button className="rounded border border-slate-300 px-3 py-2 text-sm" type="submit">
                Create folder
              </button>
            </form>
          ) : (
            <p className="text-sm text-slate-500">Maximum folder depth reached.</p>
          )}
        </div>
        {children.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No folders here.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {children.map((folder) => (
              <li key={folder.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <button className="text-left font-medium hover:underline" type="button" onClick={() => openFolder(folder.id)}>
                  {folder.name}
                </button>
                <button
                  className="text-slate-500 hover:text-red-600"
                  type="button"
                  onClick={() => {
                    void removeFolder(folder)
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8">
        <h2 className="font-medium">Assets</h2>
        {loading ? (
          <p className="mt-2 text-sm text-slate-500">Loading assets…</p>
        ) : assets.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            {search ? 'No assets match that search.' : 'No assets in this folder.'}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {assets.map((asset) => (
              <li key={asset.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                <div>
                  <p className="font-medium">{asset.name}</p>
                  <p className="text-sm text-slate-500">
                    {asset.type}
                    {asset.url ? (
                      <>
                        {' · '}
                        <a className="underline" href={asset.url} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex gap-2 text-sm">
                  <button
                    className="rounded border border-slate-300 px-2 py-1"
                    type="button"
                    onClick={() => openEdit(asset)}
                  >
                    Edit
                  </button>
                  <button
                    className="rounded border border-slate-300 px-2 py-1"
                    type="button"
                    onClick={() => {
                      void trashAsset(asset)
                    }}
                  >
                    Trash
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-slate-500">
          Trashed assets live in <Link className="underline" to="/trash">Trash</Link>.
        </p>
      </div>
    </section>
  )
}
