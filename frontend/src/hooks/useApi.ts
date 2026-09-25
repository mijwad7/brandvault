import { useMemo } from 'react'
import { useAuth } from '../features/auth/useAuth.ts'
import { createApiClient } from '../lib/api.ts'

export function useApi() {
  const { session } = useAuth()
  return useMemo(
    () => createApiClient(async () => session?.access_token ?? null),
    [session?.access_token],
  )
}
