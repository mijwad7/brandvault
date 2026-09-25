import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { FullScreenStatus } from '../../components/layout/FullScreenStatus.tsx'
import { useAuth } from './useAuth.ts'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <FullScreenStatus label="Checking your session" />
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
