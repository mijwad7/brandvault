import type { FormEvent } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { FormAlert, SelectField, TextField } from '../../components/ui/Field.tsx'
import { ASSET_TYPES, type AssetType, type Folder } from '../../types/index.ts'
import { folderMap, folderPath } from '../folders/tree.ts'
import { type AssetFormState } from './assetFormState.ts'

const typeLabels: Record<AssetType, string> = {
  image: 'Image',
  video: 'Video',
  logo: 'Logo',
  document: 'Document',
  font: 'Font',
}

type AssetFormProps = {
  values: AssetFormState
  folders: Folder[]
  saving: boolean
  error: string
  fieldErrors: Record<string, string>
  submitLabel: string
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
  onChange,
  onSubmit,
  onCancel,
}: AssetFormProps) {
  const byId = folderMap(folders)
  const options = folders
    .slice()
    .sort((a, b) => folderPath(a, byId).localeCompare(folderPath(b, byId)))

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
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
      <TextField
        label="HTTPS URL"
        type="url"
        inputMode="url"
        value={values.url}
        onChange={(event) => onChange({ ...values, url: event.target.value })}
        error={fieldErrors.url}
        placeholder="https://"
        hint="Paste a public https link."
        required
      />
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
