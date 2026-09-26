import { MAX_UPLOAD_BYTES } from '../../lib/storage.ts'
import type { Asset, AssetType } from '../../types/index.ts'

export type AssetSourceMode = 'upload' | 'url'

export type AssetFormState = {
  name: string
  type: AssetType
  url: string
  folder: string
  sourceMode: AssetSourceMode
  file: File | null
}

export const emptyAssetForm: AssetFormState = {
  name: '',
  type: 'image',
  url: '',
  folder: '',
  sourceMode: 'upload',
  file: null,
}

export function assetToForm(asset: Asset): AssetFormState {
  return {
    name: asset.name,
    type: asset.type,
    url: asset.url,
    folder: asset.folder ?? '',
    sourceMode: asset.storage_path ? 'upload' : 'url',
    file: null,
  }
}

export function assetFormProblems(
  values: AssetFormState,
  editingHasFile: boolean,
): Record<string, string> {
  const fields: Record<string, string> = {}
  if (!values.name.trim()) {
    fields.name = 'Enter a name.'
  }
  if (values.sourceMode === 'url') {
    const url = values.url.trim()
    if (!url) {
      fields.url = 'Paste an HTTPS URL.'
    } else if (!url.startsWith('https://')) {
      fields.url = 'URL must use HTTPS.'
    }
  } else if (!values.file && !editingHasFile) {
    fields.file = 'Choose a file.'
  } else if (values.file && values.file.size > MAX_UPLOAD_BYTES) {
    fields.file = 'File is larger than 20 MB.'
  }
  return fields
}
