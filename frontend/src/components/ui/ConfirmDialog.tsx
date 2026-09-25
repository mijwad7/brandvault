import { Button } from './Button.tsx'
import { Dialog } from './Dialog.tsx'
import { FormAlert } from './Field.tsx'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  pending?: boolean
  error?: string
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  error = '',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} title={title} description={description} onClose={onClose}>
      <FormAlert message={error} />
      <div className={error ? 'mt-4 flex flex-col gap-2 sm:flex-row' : 'flex flex-col gap-2 sm:flex-row'}>
        <Button variant="secondary" className="w-full" data-autofocus="" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant="danger" className="w-full" onClick={onConfirm} disabled={pending}>
          {pending ? 'Working…' : confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
