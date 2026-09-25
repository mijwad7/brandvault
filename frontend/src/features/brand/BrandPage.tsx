import { useEffect, useState, type FormEvent } from 'react'
import { ApiError, getApiErrorMessage } from '../../lib/api.ts'
import { useApi } from '../../hooks/useApi.ts'
import type { Brand } from '../../types/index.ts'
import { BrandPreview } from './BrandPreview.tsx'

type BrandFormState = {
  name: string
  primary_color: string
  secondary_color: string
  logo_url: string
  default_font: string
}

const emptyForm: BrandFormState = {
  name: '',
  primary_color: '',
  secondary_color: '',
  logo_url: '',
  default_font: '',
}

function toForm(brand: Brand): BrandFormState {
  return {
    name: brand.name,
    primary_color: brand.primary_color,
    secondary_color: brand.secondary_color,
    logo_url: brand.logo_url,
    default_font: brand.default_font,
  }
}

function pickerValue(hex: string): string {
  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    return hex
  }
  if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
    const r = hex[1]
    const g = hex[2]
    const b = hex[3]
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return '#000000'
}

export function BrandPage() {
  const api = useApi()
  const [form, setForm] = useState<BrandFormState>(emptyForm)
  const [existing, setExisting] = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const brand = await api.get<Brand>('/brand')
        if (!cancelled) {
          setExisting(brand)
          setForm(toForm(brand))
        }
      } catch (caught) {
        if (cancelled) {
          return
        }
        if (caught instanceof ApiError && caught.status === 404) {
          setExisting(null)
          setForm(emptyForm)
        } else {
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

  function update<K extends keyof BrandFormState>(key: K, value: BrandFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        name: form.name.trim(),
        primary_color: form.primary_color.trim(),
        secondary_color: form.secondary_color.trim(),
        logo_url: form.logo_url.trim(),
        default_font: form.default_font.trim(),
      }
      const brand = existing
        ? await api.patch<Brand>('/brand', payload)
        : await api.post<Brand>('/brand', payload)
      setExisting(brand)
      setForm(toForm(brand))
      setNotice(existing ? 'Brand kit updated.' : 'Brand kit created.')
    } catch (caught) {
      setError(getApiErrorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="p-6 text-sm text-slate-500">Loading brand kit…</p>
  }

  return (
    <section className="p-6">
      <h1 className="text-xl font-semibold">Brand kit</h1>
      <p className="mt-1 text-sm text-slate-600">
        {existing
          ? 'Update the brand profile for this workspace.'
          : 'No brand kit yet. Create one to get started.'}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <form className="space-y-4 rounded-lg border border-slate-200 bg-white p-5" onSubmit={onSubmit}>
          <label className="block text-sm">
            Brand name
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField
              label="Primary color"
              value={form.primary_color}
              onChange={(value) => update('primary_color', value)}
            />
            <ColorField
              label="Secondary color"
              value={form.secondary_color}
              onChange={(value) => update('secondary_color', value)}
            />
          </div>

          <label className="block text-sm">
            Default font
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={form.default_font}
              onChange={(event) => update('default_font', event.target.value)}
              placeholder="Inter"
            />
          </label>

          <label className="block text-sm">
            Logo URL
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              type="url"
              value={form.logo_url}
              onChange={(event) => update('logo_url', event.target.value)}
              placeholder="https://"
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

          <button
            className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
            type="submit"
            disabled={saving}
          >
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Create brand kit'}
          </button>
        </form>

        <BrandPreview
          name={form.name}
          primaryColor={form.primary_color}
          secondaryColor={form.secondary_color}
          logoUrl={form.logo_url}
          defaultFont={form.default_font}
        />
      </div>
    </section>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-sm">
      {label}
      <span className="mt-1 flex items-center gap-2">
        <input
          className="h-10 w-10 cursor-pointer rounded border border-slate-300 bg-white"
          type="color"
          value={pickerValue(value)}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          aria-label={`${label} picker`}
        />
        <input
          className="w-full rounded border border-slate-300 px-3 py-2 font-mono"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#AABBCC"
        />
      </span>
    </label>
  )
}
