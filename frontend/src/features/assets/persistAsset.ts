import type { ApiClient } from '../../lib/api.ts'
import { uploadStorageObject } from '../../lib/storage.ts'
import type { Asset } from '../../types/index.ts'
import type { AssetFormState } from './assetFormState.ts'

function failureText(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'Upload failed.'
}

export async function persistAsset(
  api: ApiClient,
  form: AssetFormState,
  editing: Asset | null,
): Promise<Asset> {
  const meta = {
    name: form.name.trim(),
    type: form.type,
    folder: form.folder || null,
  }

  if (form.sourceMode === 'url') {
    const body = {
      ...meta,
      url: form.url.trim(),
      ...(editing?.storage_path ? { clear_storage: true } : {}),
    }
    return editing
      ? api.patch<Asset>(`/assets/${editing.id}`, body)
      : api.post<Asset>('/assets', body)
  }

  const file = form.file
  if (editing?.storage_path && !file) {
    return api.patch<Asset>(`/assets/${editing.id}`, meta)
  }
  if (!file) {
    throw new Error('Choose a file.')
  }

  if (editing?.storage_path) {
    const url = await uploadStorageObject(editing.storage_bucket, editing.storage_path, file)
    return api.patch<Asset>(`/assets/${editing.id}`, { ...meta, url })
  }

  let createdId: string | null = null
  let shouldTrash = false
  let shouldClear = false
  try {
    const minted = editing
      ? await api.patch<Asset>(`/assets/${editing.id}`, {
          ...meta,
          filename: file.name,
          content_type: file.type,
        })
      : await api.post<Asset>('/assets', {
          ...meta,
          filename: file.name,
          content_type: file.type,
        })
    createdId = minted.id
    shouldTrash = !editing
    shouldClear = Boolean(editing)
    const url = await uploadStorageObject(minted.storage_bucket, minted.storage_path, file)
    shouldTrash = false
    shouldClear = false
    return await api.patch<Asset>(`/assets/${minted.id}`, { url })
  } catch (error) {
    if (shouldTrash && createdId) {
      try {
        await api.post(`/assets/${createdId}/trash`)
      } catch {
        throw new Error(
          `${failureText(error)} The unfinished asset is still in the library because cleanup failed. Move it to trash.`,
        )
      }
      throw new Error(`${failureText(error)} The unfinished asset was moved to trash.`)
    }
    if (shouldClear && editing) {
      try {
        await api.patch(`/assets/${editing.id}`, { clear_storage: true })
      } catch {
        throw new Error(
          `${failureText(error)} Storage metadata could not be rolled back. Edit the asset and save a URL, or move it to trash.`,
        )
      }
    }
    throw error
  }
}
