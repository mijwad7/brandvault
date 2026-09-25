export function FullScreenStatus({ label }: { label: string }) {
  return (
    <div className="grid min-h-svh place-items-center bg-bg px-6 text-ink">
      <div className="flex flex-col items-center gap-3">
        <div className="size-10 animate-pulse rounded-2xl bg-accent motion-reduce:animate-none" />
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  )
}
