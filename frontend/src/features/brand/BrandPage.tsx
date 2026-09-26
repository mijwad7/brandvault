import { useEffect, useState, type FormEvent } from 'react'
import { PageHeader } from '../../components/layout/PageHeader.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { EmptyState } from '../../components/ui/EmptyState.tsx'
import { controlClass, FormAlert, TextField } from '../../components/ui/Field.tsx'
import { Skeleton } from '../../components/ui/Skeleton.tsx'
import { useToast } from '../../components/ui/useToast.ts'
import { useApi } from '../../hooks/useApi.ts'
import { isInlineApiError, readApiErrors } from '../../lib/api.ts'
import { cn } from '../../lib/cn.ts'
import { pickerValue } from '../../lib/color.ts'
import { isPreviewableImage, joinStoragePath, logoObjectName, MAX_UPLOAD_BYTES, uploadStorageObject } from '../../lib/storage.ts'
import type { Brand, Me } from '../../types/index.ts'
import { BrandPreview } from './BrandPreview.tsx'
import { useBrandKit } from './useBrandKit.ts'

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

export function BrandPage() {
  const api = useApi()
  const kit = useBrandKit()
  const toast = useToast()
  const [draft, setDraft] = useState<BrandFormState | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoInputKey, setLogoInputKey] = useState(0)
  const [logoError, setLogoError] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const form = draft ?? (kit.brand ? toForm(kit.brand) : emptyForm)
  const logoPreview = useObjectUrl(logoFile)

  function update<K extends keyof BrandFormState>(key: K, value: BrandFormState[K]) {
    setDraft((current) => ({ ...(current ?? form), [key]: value }))
    setFieldErrors((current) => {
      if (!current[key]) {
        return current
      }
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    setLogoError('')
    setFieldErrors({})
    const logoUrl = form.logo_url.trim()
    if (!logoFile && logoUrl && !logoUrl.startsWith('https://')) {
      setFieldErrors({ logo_url: 'Logo URL must use HTTPS.' })
      setSaving(false)
      return
    }
    if (logoFile && logoFile.size > MAX_UPLOAD_BYTES) {
      setLogoError('File is larger than 20 MB.')
      setSaving(false)
      return
    }

    let nextLogo = logoUrl
    if (logoFile) {
      try {
        const me = await api.get<Me>('/me')
        nextLogo = await uploadStorageObject(
          me.storage_bucket,
          joinStoragePath(me.storage_prefix, `brand/${logoObjectName(logoFile)}`),
          logoFile,
        )
      } catch (caught) {
        const parsed = readApiErrors(caught)
        setLogoError(parsed.form || 'Could not upload the logo.')
        if (!isInlineApiError(caught)) {
          toast.error(parsed.form || 'Could not upload the logo.')
        }
        setSaving(false)
        return
      }
    }

    const payload = {
      name: form.name.trim(),
      primary_color: form.primary_color.trim(),
      secondary_color: form.secondary_color.trim(),
      logo_url: nextLogo,
      default_font: form.default_font.trim(),
    }
    try {
      const saved = kit.brand
        ? await api.patch<Brand>('/brand', payload)
        : await api.post<Brand>('/brand', payload)
      kit.setBrand(saved)
      setDraft(null)
      setLogoFile(null)
      setLogoInputKey((current) => current + 1)
      toast.success(kit.brand ? 'Brand kit saved.' : 'Brand kit created.')
    } catch (caught) {
      const parsed = readApiErrors(caught)
      setFieldErrors(parsed.fields)
      setFormError(parsed.form)
      if (!isInlineApiError(caught)) {
        toast.error(parsed.form || 'Could not save the brand kit.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (kit.error) {
    return (
      <EmptyState
        tone="error"
        title="Couldn’t load the brand kit"
        body={kit.error}
        action={
          <Button
            onClick={() => {
              setDraft(null)
              void kit.refresh()
            }}
          >
            Try again
          </Button>
        }
      />
    )
  }

  if (kit.loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-96" />
        <Skeleton className="h-72" />
      </div>
    )
  }

  const existing = kit.brand

  return (
    <section>
      <PageHeader
        title="Brand kit"
        description={
          existing
            ? 'Colors, type, and logo for this workspace. The preview updates as you edit.'
            : 'No brand kit yet. Create one and it will show up in the app chrome.'
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form
          className="space-y-4 rounded-3xl border border-line bg-surface p-4 shadow-sm sm:p-5"
          onSubmit={(event) => {
            void onSubmit(event)
          }}
        >
          <TextField
            label="Brand name"
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            error={fieldErrors.name}
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField
              label="Primary color"
              value={form.primary_color}
              error={fieldErrors.primary_color}
              onChange={(value) => update('primary_color', value)}
            />
            <ColorField
              label="Secondary color"
              value={form.secondary_color}
              error={fieldErrors.secondary_color}
              onChange={(value) => update('secondary_color', value)}
            />
          </div>

          <TextField
            label="Default font"
            value={form.default_font}
            onChange={(event) => update('default_font', event.target.value)}
            error={fieldErrors.default_font}
            placeholder="Fraunces"
            hint="A font name already installed on this device, or a generic family."
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="brand-logo-file">
              Logo file
            </label>
            <input
              key={logoInputKey}
              id="brand-logo-file"
              className="block w-full text-sm text-ink file:mr-3 file:h-11 file:rounded-xl file:border-0 file:bg-muted-surface file:px-3 file:text-sm file:font-medium file:text-ink"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                setLogoFile(file)
                setLogoError('')
              }}
            />
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              Optional. PNG, JPG, WEBP, GIF, or SVG. Max 20 MB. A file replaces the URL below.
            </p>
            {logoError ? <p className="mt-1.5 text-sm text-danger">{logoError}</p> : null}
          </div>

          <TextField
            label="Logo URL"
            type="url"
            value={form.logo_url}
            onChange={(event) => update('logo_url', event.target.value)}
            error={fieldErrors.logo_url}
            placeholder="https://"
            hint="Optional if you upload a file. HTTPS only."
          />

          <FormAlert message={formError} />

          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Create brand kit'}
          </Button>
        </form>

        <BrandPreview
          name={form.name}
          primaryColor={form.primary_color}
          secondaryColor={form.secondary_color}
          logoUrl={logoPreview || form.logo_url}
          defaultFont={form.default_font}
        />
      </div>
    </section>
  )
}

function useObjectUrl(file: File | null): string {
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (!file || !isPreviewableImage(file)) {
      return
    }
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => {
      URL.revokeObjectURL(next)
      setUrl('')
    }
  }, [file])

  return url
}

function ColorField({
  label,
  value,
  error,
  onChange,
}: {
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  const hintId = `${label}-hint`
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <span className="flex items-center gap-2">
        <input
          className="h-11 w-14 cursor-pointer rounded-xl border border-line bg-surface p-1"
          type="color"
          value={pickerValue(value)}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          aria-label={`${label} picker`}
        />
        <input
          className={cn(controlClass, 'font-mono uppercase', error && 'border-danger')}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#1E4D3A"
          aria-label={`${label} hex`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? hintId : undefined}
          spellCheck={false}
          maxLength={7}
        />
      </span>
      {error ? (
        <p id={hintId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
