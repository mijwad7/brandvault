import { env } from './env.ts'

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown) {
    super(`Request failed with status ${status}`)
    this.status = status
    this.body = body
  }
}

type TokenGetter = () => Promise<string | null>

export function createApiClient(getToken: TokenGetter) {
  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers)
    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json')
    }

    const token = await getToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const response = await fetch(`${env.apiUrl}/api${path}`, {
      ...options,
      headers,
    })

    if (response.status === 204) {
      return undefined as T
    }

    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      throw new ApiError(response.status, body)
    }
    return body as T
  }

  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body?: unknown) =>
      request<T>(path, {
        method: 'POST',
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    patch: <T>(path: string, body?: unknown) =>
      request<T>(path, {
        method: 'PATCH',
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>

export function readApiErrors(error: unknown): {
  form: string
  fields: Record<string, string>
} {
  const fields: Record<string, string> = {}
  let form = ''

  if (error instanceof ApiError && error.body && typeof error.body === 'object' && !Array.isArray(error.body)) {
    const body = error.body as Record<string, unknown>
    if (typeof body.detail === 'string') {
      form = body.detail
    }
    for (const [key, value] of Object.entries(body)) {
      if (key === 'detail') {
        continue
      }
      const text = Array.isArray(value)
        ? value.map((item) => String(item)).join(', ')
        : typeof value === 'string'
          ? value
          : ''
      if (!text) {
        continue
      }
      if (key === 'non_field_errors') {
        form = form || text
      } else {
        fields[key] = text
      }
    }
  }

  if (!form && Object.keys(fields).length === 0) {
    form = getApiErrorMessage(error)
  }

  return { form, fields }
}

export function isInlineApiError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 400 || error.status === 409)
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.body && typeof error.body === 'object') {
    const body = error.body as Record<string, unknown>
    if (typeof body.detail === 'string') {
      return body.detail
    }
    const parts: string[] = []
    for (const [key, value] of Object.entries(body)) {
      if (Array.isArray(value)) {
        parts.push(`${key}: ${value.join(', ')}`)
      } else if (typeof value === 'string') {
        parts.push(`${key}: ${value}`)
      }
    }
    if (parts.length > 0) {
      return parts.join(' ')
    }
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Something went wrong.'
}
