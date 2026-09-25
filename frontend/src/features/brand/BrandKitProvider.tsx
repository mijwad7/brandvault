import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useApi } from '../../hooks/useApi.ts'
import { ApiError, getApiErrorMessage } from '../../lib/api.ts'
import { isHexColor } from '../../lib/color.ts'
import type { Brand } from '../../types/index.ts'
import { BrandKitContext } from './useBrandKit.ts'

export function BrandKitProvider({ children }: { children: ReactNode }) {
  const api = useApi()
  const [brand, setBrandState] = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setBrandState(await api.get<Brand>('/brand'))
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        setBrandState(null)
      } else {
        setBrandState(null)
        setError(getApiErrorMessage(caught))
      }
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const next = await api.get<Brand>('/brand')
        if (!cancelled) {
          setBrandState(next)
        }
      } catch (caught) {
        if (cancelled) {
          return
        }
        if (caught instanceof ApiError && caught.status === 404) {
          setBrandState(null)
        } else {
          setBrandState(null)
          setError(getApiErrorMessage(caught))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [api])

  useEffect(() => {
    const root = document.documentElement
    const primary = brand && isHexColor(brand.primary_color) ? brand.primary_color : ''
    const secondary = brand && isHexColor(brand.secondary_color) ? brand.secondary_color : ''
    if (primary) {
      root.style.setProperty('--brand-primary', primary)
    } else {
      root.style.removeProperty('--brand-primary')
    }
    if (secondary) {
      root.style.setProperty('--brand-secondary', secondary)
    } else {
      root.style.removeProperty('--brand-secondary')
    }
    return () => {
      root.style.removeProperty('--brand-primary')
      root.style.removeProperty('--brand-secondary')
    }
  }, [brand])

  const setBrand = useCallback((next: Brand | null) => {
    setBrandState(next)
    setError('')
  }, [])

  const value = useMemo(
    () => ({ brand, loading, error, refresh, setBrand }),
    [brand, loading, error, refresh, setBrand],
  )

  return <BrandKitContext.Provider value={value}>{children}</BrandKitContext.Provider>
}
