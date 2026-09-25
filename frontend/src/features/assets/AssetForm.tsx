import type { FormEvent } from 'react'
import { ASSET_TYPES, type Asset, type AssetType, type Folder } from '../../types/index.ts'
import { folderMap, folderPath } from '../folders/tree.ts'

export type AssetFormState = {
  name: string
  type: AssetType
  url: string
  folder: string
}

export const emptyAssetForm: AssetFormState = {
  name: '',
  type: 'image',
  url: '',
  folder: '',
}

export function assetToForm(asset: Asset): AssetFormState {
  return {
    name: asset.name,
    type: asset.type,
    url: asset.url,
    folder: asset.folder ?? '',
  }
}

type AssetFormProps = {
  title: string
  values: AssetFormState
  folders: Folder[]
  saving: boolean
  submitLabel: string
  onChange: (values: AssetFormState) => void
  onSubmit: () => void
  onCancel: () => void
}

export function AssetForm({
  title,
  values,
  folders,
  saving,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
}: AssetFormProps) {
  const byId = folderMap(folders)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form
      className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
      onSubmit={handleSubmit}
    >
      <h2 className="font-medium">{title}</h2>
      <label className="block text-sm">
        Name
        <input
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          value={values.name}
          onChange={(event) => onChange({ ...values, name: event.target.value })}
          required
        />
      </label>
      <label className="block text-sm">
        Type
        <select
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          value={values.type}
          onChange={(event) =>
            onChange({ ...values, type: event.target.value as AssetType })
          }
        >
          {ASSET_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        HTTPS URL
        <input
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          type="url"
          value={values.url}
          onChange={(event) => onChange({ ...values, url: event.target.value })}
          placeholder="https://"
          required
        />
      </label>
      <label className="block text-sm">
        Folder
        <select
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          value={values.folder}
          onChange={(event) => onChange({ ...values, folder: event.target.value })}
        >
          <option value="">Library root</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folderPath(folder, byId)}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button
          className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          type="submit"
          disabled={saving}
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
        <button
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
