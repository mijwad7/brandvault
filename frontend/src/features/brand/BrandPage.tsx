import { useEffect, useState, type FormEvent } from 'react'
import { PageHeader } from '../../components/layout/PageHeader.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { EmptyState } from '../../components/ui/EmptyState.tsx'
import { controlClass, FileField, FormAlert, TextField } from '../../components/ui/Field.tsx'
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
  const [logoLinkFocused, setLogoLinkFocused] = useState(false)
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
      setFieldErrors({ logo_url: 'Use a logo link that starts with https.' })
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
    <section className="min-w-0">
      <PageHeader
        title="Brand kit"
        description={
          existing
            ? 'Name, colors, and logo. The preview updates as you edit.'
            : 'Add a name, colors, and logo. They’ll show across the app.'
        }
      />

      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form
          className="min-w-0 space-y-4 rounded-3xl border border-line bg-surface p-4 shadow-sm sm:p-5"
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
            hint="For example, Georgia or Arial."
          />

          <FileField
            label="Logo file"
            accept="image/*"
            inputKey={logoInputKey}
            fileName={logoFile?.name}
            hint="Optional. An image up to 20 MB. Uploading a file replaces the link below."
            error={logoError}
            onChange={(file) => {
              setLogoFile(file)
              setLogoError('')
            }}
          />

          <LogoLinkField
            value={form.logo_url}
            error={fieldErrors.logo_url}
            focused={logoLinkFocused}
            onFocus={() => setLogoLinkFocused(true)}
            onBlur={() => setLogoLinkFocused(false)}
            onChange={(value) => update('logo_url', value)}
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

function fileNameFromUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) {
    return ''
  }
  try {
    const name = decodeURIComponent(new URL(trimmed).pathname.split('/').filter(Boolean).pop() ?? '')
    return name
  } catch {
    return trimmed.split('/').pop()?.split('?')[0] ?? ''
  }
}

function LogoLinkField({
  value,
  error,
  focused,
  onFocus,
  onBlur,
  onChange,
}: {
  value: string
  error?: string
  focused: boolean
  onFocus: () => void
  onBlur: () => void
  onChange: (value: string) => void
}) {
  const fileName = fileNameFromUrl(value)
  const showName = Boolean(fileName) && !focused

  return (
    <div className="min-w-0">
      <label htmlFor="brand-logo-url" className="mb-1.5 block text-sm font-medium text-ink">
        Logo URL
      </label>
      <div className="relative min-w-0">
        <input
          id="brand-logo-url"
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="https://"
          aria-invalid={error ? true : undefined}
          className={cn(controlClass, 'min-w-0', error && 'border-danger', showName && 'text-transparent')}
        />
        {showName ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 left-3 flex items-center truncate text-sm text-ink">
            {fileName}
          </span>
        ) : null}
      </div>
      {error ? <p className="mt-1.5 text-sm text-danger">{error}</p> : null}
      {value ? (
        <p className="mt-1.5 min-w-0 truncate text-xs text-muted" title={value}>
          {value}
        </p>
      ) : (
        <p className="mt-1.5 text-xs leading-relaxed text-muted">Optional if you upload a file.</p>
      )}
    </div>
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
          className={cn(controlClass, 'min-w-0 font-mono uppercase', error && 'border-danger')}
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
