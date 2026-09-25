import { createContext, useContext } from 'react'
import type { Brand } from '../../types/index.ts'

export type BrandKitContextValue = {
  brand: Brand | null
  loading: boolean
  error: string
  refresh: () => Promise<void>
  setBrand: (brand: Brand | null) => void
}

export const BrandKitContext = createContext<BrandKitContextValue | null>(null)

export function useBrandKit(): BrandKitContextValue {
  const value = useContext(BrandKitContext)
  if (!value) {
    throw new Error('useBrandKit must be used within BrandKitProvider')
  }
  return value
}
