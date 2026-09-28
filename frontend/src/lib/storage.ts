import { getSupabase } from './supabase.ts'

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

const LOGO_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'] as const

export class StorageUploadError extends Error {
  status: number | null

  constructor(message: string, status: number | null) {
    super(message)
    this.name = 'StorageUploadError'
    this.status = status
  }
}

type StorageErrorLike = {
  message?: string
  status?: number | string
  statusCode?: number | string
}

export function isPreviewableImage(file: File): boolean {
  if (file.type.startsWith('image/')) {
    return true
  }
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name)
}

export function assertUploadable(file: File): void {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new StorageUploadError('File is larger than 20 MB.', null)
  }
}

export function logoObjectName(file: File): string {
  const raw = file.name.split('.').pop()?.toLowerCase() ?? ''
  const fromName = LOGO_EXTENSIONS.find((ext) => ext === raw)
  if (fromName === 'jpeg') {
    return 'logo.jpg'
  }
  if (fromName) {
    return `logo.${fromName}`
  }
  if (file.type === 'image/jpeg') {
    return 'logo.jpg'
  }
  if (file.type === 'image/webp') {
    return 'logo.webp'
  }
  if (file.type === 'image/gif') {
    return 'logo.gif'
  }
  if (file.type === 'image/svg+xml') {
    return 'logo.svg'
  }
  return 'logo.png'
}

export function joinStoragePath(prefix: string, name: string): string {
  const base = prefix.endsWith('/') ? prefix : `${prefix}/`
  return `${base}${name.replace(/^\/+/, '')}`
}

export async function removeStorageObject(bucket: string, path: string): Promise<void> {
  if (!bucket || !path) {
    return
  }
  const supabase = getSupabase()
  if (!supabase) {
    throw new StorageUploadError('The stored file could not be removed.', null)
  }
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) {
    throw new StorageUploadError(
      error.message || 'The stored file could not be removed.',
      statusFrom(error),
    )
  }
}

export async function uploadStorageObject(
  bucket: string,
  path: string,
  file: File,
): Promise<string> {
  assertUploadable(file)
  const supabase = getSupabase()
  if (!supabase) {
    throw new StorageUploadError('Uploads aren’t available right now.', null)
  }

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
  })
  if (error) {
    throw new StorageUploadError(storageFailureMessage(bucket, error), statusFrom(error))
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  if (!data.publicUrl.startsWith('https://')) {
    throw new StorageUploadError('The upload finished, but the file link wasn’t usable.', null)
  }
  const join = data.publicUrl.includes('?') ? '&' : '?'
  return `${data.publicUrl}${join}v=${Date.now()}`
}

function statusFrom(error: StorageErrorLike): number | null {
  const raw = error.statusCode ?? error.status
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw
  }
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function storageFailureMessage(_bucket: string, error: StorageErrorLike): string {
  const status = statusFrom(error)
  const message = error.message ?? ''
  if (status === 403 || /row-level security|policy|unauthorized|violates/i.test(message)) {
    return 'The file couldn’t be uploaded. Check that you’re signed in, then try again.'
  }
  if (status === 404 || /bucket not found|not found/i.test(message)) {
    return 'The file couldn’t be uploaded. Try again in a moment.'
  }
  return message || 'Upload failed.'
}
