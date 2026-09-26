import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { Dialog } from '../../components/ui/Dialog.tsx'
import { FormAlert, TextField } from '../../components/ui/Field.tsx'
import type { Asset } from '../../types/index.ts'
import type { AISuggestion } from './types.ts'

type TagReviewDialogProps = {
  asset: Asset | null
  suggestion: AISuggestion | null
  open: boolean
  saving: boolean
  error: string
  onClose: () => void
  onSave: (suggestion: AISuggestion) => void
}

export function TagReviewDialog({
  asset,
  suggestion,
  open,
  saving,
  error,
  onClose,
  onSave,
}: TagReviewDialogProps) {
  const [tagsText, setTagsText] = useState('')
  const [description, setDescription] = useState('')
  const [usage, setUsage] = useState('')
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!open || !suggestion) {
      return
    }
    setTagsText(suggestion.tags.join(', '))
    setDescription(suggestion.description)
    setUsage(suggestion.usage_suggestion)
    setLocalError('')
  }, [open, suggestion])

  function submit() {
    const tags = tagsText
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
    const unique = [...new Set(tags)]
    if (unique.length < 3 || unique.length > 8) {
      setLocalError('Enter 3 to 8 tags, separated by commas.')
      return
    }
    if (!description.trim() || !usage.trim()) {
      setLocalError('Description and usage suggestion are required.')
      return
    }
    setLocalError('')
    onSave({
      tags: unique,
      description: description.trim(),
      usage_suggestion: usage.trim(),
    })
  }

  return (
    <Dialog
      open={open}
      title="Review tags"
      description={
        asset
          ? `Suggested metadata for “${asset.name}”. Nothing is saved until you accept.`
          : 'Nothing is saved until you accept.'
      }
      onClose={() => {
        if (!saving) {
          onClose()
        }
      }}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        {asset && (asset.tags.length > 0 || asset.description) ? (
          <div className="rounded-xl bg-muted-surface px-3 py-2 text-sm text-muted">
            <p className="font-medium text-ink">Current</p>
            {asset.tags.length > 0 ? <p className="mt-1">{asset.tags.join(', ')}</p> : null}
            {asset.description ? <p className="mt-1">{asset.description}</p> : null}
          </div>
        ) : null}
        <TextField
          label="Tags"
          hint="3 to 8 short lowercase tags, separated by commas."
          value={tagsText}
          onChange={(event) => setTagsText(event.target.value)}
          data-autofocus=""
          required
        />
        <label className="block text-sm font-medium text-ink">
          Description
          <textarea
            className="mt-1.5 min-h-20 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium text-ink">
          Usage suggestion
          <textarea
            className="mt-1.5 min-h-20 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            value={usage}
            onChange={(event) => setUsage(event.target.value)}
            required
          />
        </label>
        <FormAlert message={localError || error} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Saving…' : 'Save to asset'}
          </Button>
          <Button type="button" variant="secondary" className="w-full" disabled={saving} onClick={onClose}>
            Discard
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
