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
