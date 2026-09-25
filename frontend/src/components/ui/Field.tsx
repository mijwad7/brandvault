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
