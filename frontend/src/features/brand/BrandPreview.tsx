type SwatchProps = {
  label: string
  color: string
}

function Swatch({ label, color }: SwatchProps) {
  const valid = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color)
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-14 w-14 rounded-md border border-slate-200"
        style={{ backgroundColor: valid ? color : '#e2e8f0' }}
        title={valid ? color : 'No color set'}
      />
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <p className="font-mono text-sm">{valid ? color : '—'}</p>
      </div>
    </div>
  )
}

type BrandPreviewProps = {
  name: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string
  defaultFont: string
}

export function BrandPreview({
  name,
  primaryColor,
  secondaryColor,
  logoUrl,
  defaultFont,
}: BrandPreviewProps) {
  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">Preview</p>
      <h2
        className="mt-2 text-2xl font-semibold"
        style={{ fontFamily: defaultFont || 'system-ui, sans-serif' }}
      >
        {name.trim() || 'Brand name'}
      </h2>
      {defaultFont ? (
        <p className="mt-1 text-sm text-slate-500">Font: {defaultFont}</p>
      ) : null}
      <div className="mt-4 flex flex-col gap-3">
        <Swatch label="Primary" color={primaryColor} />
        <Swatch label="Secondary" color={secondaryColor} />
      </div>
      {logoUrl ? (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Logo</p>
          <img
            src={logoUrl}
            alt="Brand logo"
            className="mt-2 max-h-16 max-w-full object-contain"
          />
        </div>
      ) : null}
    </aside>
  )
}
