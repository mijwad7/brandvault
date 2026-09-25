import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage } from '../../lib/api.ts'
import { useApi } from '../../hooks/useApi.ts'
import type { Asset } from '../../types/index.ts'

export function TrashPage() {
  const api = useApi()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      setAssets(await api.get<Asset[]>('/assets?trashed=true'))
    } catch (caught) {
      setError(getApiErrorMessage(caught))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [api])

  async function restore(asset: Asset) {
    setError('')
    try {
      await api.post(`/assets/${asset.id}/restore`)
      await load()
    } catch (caught) {
      setError(getApiErrorMessage(caught))
    }
  }

  return (
    <section className="p-6">
      <h1 className="text-xl font-semibold">Trash</h1>
      <p className="mt-1 text-sm text-slate-600">
        Soft-deleted assets. Restore sends them back to the library.
      </p>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading trash…</p>
      ) : assets.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Trash is empty.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {assets.map((asset) => (
            <li key={asset.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
              <div>
                <p className="font-medium">{asset.name}</p>
                <p className="text-sm text-slate-500">{asset.type}</p>
              </div>
              <button
                className="rounded border border-slate-300 px-2 py-1 text-sm"
                type="button"
                onClick={() => {
                  void restore(asset)
                }}
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm text-slate-500">
        <Link className="underline" to="/library">
          Back to library
        </Link>
      </p>
    </section>
  )
}
