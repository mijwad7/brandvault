export function TrashPage() {
  return (
    <section className="p-6">
      <h1 className="text-xl font-semibold">Trash</h1>
      <p className="mt-2 text-sm text-slate-600">
        Soft-deleted assets will be listed here from `GET /api/assets?trashed=true`
        and restored with `POST /api/assets/:id/restore`.
      </p>
    </section>
  )
}
