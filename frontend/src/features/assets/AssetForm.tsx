import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { FormAlert, SelectField, TextField } from '../../components/ui/Field.tsx'
import { cn } from '../../lib/cn.ts'
import { isPreviewableImage } from '../../lib/storage.ts'
import { ASSET_TYPES, type AssetType, type Folder } from '../../types/index.ts'
import { folderMap, folderPath } from '../folders/tree.ts'
import { type AssetFormState, type AssetSourceMode } from './assetFormState.ts'

const typeLabels: Record<AssetType, string> = {
  image: 'Image',
  video: 'Video',
  logo: 'Logo',
  document: 'Document',
  font: 'Font',
}

const acceptFor: Record<AssetType, string> = {
  image: 'image/*',
  logo: 'image/*',
  video: 'video/*',
  document: '.pdf,.txt,.md,.doc,.docx',
  font: '.ttf,.otf,.woff,.woff2',
}

type AssetFormProps = {
  values: AssetFormState
  folders: Folder[]
  saving: boolean
  error: string
  fieldErrors: Record<string, string>
  submitLabel: string
  storedFileName: string
  onChange: (values: AssetFormState) => void
  onSubmit: () => void
  onCancel: () => void
}

export function AssetForm({
  values,
  folders,
  saving,
  error,
  fieldErrors,
  submitLabel,
  storedFileName,
  onChange,
  onSubmit,
  onCancel,
}: AssetFormProps) {
  const byId = folderMap(folders)
  const options = folders
    .slice()
    .sort((a, b) => folderPath(a, byId).localeCompare(folderPath(b, byId)))
  const previewUrl = useObjectUrl(values.file)
  const showPreview =
    (values.type === 'image' || values.type === 'logo') &&
    (Boolean(previewUrl) || (values.sourceMode === 'url' && values.url.startsWith('https://')))
  const previewSrc = previewUrl || values.url

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  function setMode(sourceMode: AssetSourceMode) {
    onChange({
      ...values,
      sourceMode,
      file: sourceMode === 'url' ? null : values.file,
      url: sourceMode === 'upload' ? '' : values.url,
    })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <TextField
        label="Name"
        value={values.name}
        onChange={(event) => onChange({ ...values, name: event.target.value })}
        error={fieldErrors.name}
        required
        data-autofocus=""
      />
      <SelectField
        label="Type"
        value={values.type}
        error={fieldErrors.type}
        onChange={(event) => onChange({ ...values, type: event.target.value as AssetType })}
      >
        {ASSET_TYPES.map((type) => (
          <option key={type} value={type}>
            {typeLabels[type]}
          </option>
        ))}
      </SelectField>
      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink">Source</span>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Asset source">
          <ModeButton
            checked={values.sourceMode === 'upload'}
            onClick={() => setMode('upload')}
          >
            Upload file
          </ModeButton>
          <ModeButton checked={values.sourceMode === 'url'} onClick={() => setMode('url')}>
            Paste URL
          </ModeButton>
        </div>
      </div>
      {values.sourceMode === 'upload' ? (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="asset-file">
            File
          </label>
          <input
            id="asset-file"
            className={cn(
              'block w-full text-sm text-ink file:mr-3 file:h-11 file:rounded-xl file:border-0 file:bg-muted-surface file:px-3 file:text-sm file:font-medium file:text-ink',
              fieldErrors.file && 'text-danger',
            )}
            type="file"
            accept={acceptFor[values.type]}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              onChange({ ...values, file })
            }}
          />
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            {storedFileName
              ? `Stored as ${storedFileName}. Choose a new file to replace it. Max 20 MB.`
              : 'Max 20 MB. Or switch to Paste URL.'}
          </p>
          {fieldErrors.file ? <p className="mt-1.5 text-sm text-danger">{fieldErrors.file}</p> : null}
        </div>
      ) : (
        <TextField
          label="HTTPS URL"
          type="url"
          inputMode="url"
          value={values.url}
          onChange={(event) => onChange({ ...values, url: event.target.value })}
          error={fieldErrors.url}
          placeholder="https://"
          hint="Paste a public https link. Leave the file empty."
          required
        />
      )}
      {showPreview ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-muted-surface">
          <img src={previewSrc} alt="" className="max-h-40 w-full object-contain" />
        </div>
      ) : null}
      <SelectField
        label="Folder"
        value={values.folder}
        error={fieldErrors.folder}
        onChange={(event) => onChange({ ...values, folder: event.target.value })}
      >
        <option value="">Library root</option>
        {options.map((folder) => (
          <option key={folder.id} value={folder.id}>
            {folderPath(folder, byId)}
          </option>
        ))}
      </SelectField>
      <FormAlert message={error} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </Button>
        <Button type="button" variant="secondary" className="w-full" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function ModeButton({
  checked,
  onClick,
  children,
}: {
  checked: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      className={cn(
        'h-11 rounded-xl border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        checked ? 'border-ink bg-muted-surface text-ink' : 'border-line bg-surface text-muted',
      )}
      onClick={onClick}
    >
      {children}
    </button>
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
