import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn.ts'

export const controlClass =
  'h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none transition placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50'

type FieldChrome = {
  label: string
  error?: string
  hint?: string
  children: (ids: { id: string; describedBy?: string }) => ReactNode
}

function FieldChrome({ label, error, hint, children }: FieldChrome) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children({ id, describedBy })}
      {hint ? (
        <p id={hintId} className="mt-1.5 text-xs leading-relaxed text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

type TextFieldProps = {
  label: string
  error?: string
  hint?: string
} & InputHTMLAttributes<HTMLInputElement>

export function TextField({ label, error, hint, className, ...props }: TextFieldProps) {
  return (
    <FieldChrome label={label} error={error} hint={hint}>
      {({ id, describedBy }) => (
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(controlClass, error && 'border-danger', className)}
          {...props}
        />
      )}
    </FieldChrome>
  )
}

type SelectFieldProps = {
  label: string
  error?: string
  hint?: string
  children: ReactNode
} & SelectHTMLAttributes<HTMLSelectElement>

export function SelectField({ label, error, hint, children, className, ...props }: SelectFieldProps) {
  return (
    <FieldChrome label={label} error={error} hint={hint}>
      {({ id, describedBy }) => (
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(controlClass, error && 'border-danger', className)}
          {...props}
        >
          {children}
        </select>
      )}
    </FieldChrome>
  )
}

export function FormAlert({ message }: { message: string }) {
  if (!message) {
    return null
  }
  return (
    <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </p>
  )
}

type FileFieldProps = {
  label: string
  hint?: string
  error?: string
  accept?: string
  fileName?: string
  inputKey?: string | number
  onChange: (file: File | null) => void
}

export function FileField({ label, hint, error, accept, fileName, inputKey, onChange }: FileFieldProps) {
  return (
    <FieldChrome label={label} error={error} hint={hint}>
      {({ id, describedBy }) => (
        <div
          className={cn(
            'flex h-11 items-center gap-3 rounded-xl border border-line bg-surface pr-3 pl-1.5',
            error && 'border-danger',
          )}
        >
          <input
            key={inputKey}
            id={id}
            type="file"
            accept={accept}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className="sr-only"
            onChange={(event) => {
              onChange(event.target.files?.[0] ?? null)
            }}
          />
          <label
            htmlFor={id}
            className="inline-flex h-8 shrink-0 cursor-pointer items-center rounded-lg bg-muted-surface px-3 text-sm font-medium text-ink"
          >
            Choose file
          </label>
          <span className="min-w-0 truncate text-sm text-muted">{fileName || 'No file chosen'}</span>
        </div>
      )}
    </FieldChrome>
  )
}
