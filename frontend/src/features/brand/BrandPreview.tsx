import { useState } from 'react'
import { isHexColor, readableInk } from '../../lib/color.ts'

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
  const primary = primaryColor.trim()
  const secondary = secondaryColor.trim()
  const primaryOk = isHexColor(primary)
  const secondaryOk = isHexColor(secondary)

  return (
    <aside className="rounded-3xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <p className="text-xs font-medium tracking-[0.16em] text-muted uppercase">Live preview</p>
      <div className="@container mt-4 overflow-hidden rounded-2xl border border-line">
        <div className="grid grid-cols-1 @min-[19rem]:grid-cols-2">
          <SwatchPanel label="Primary" color={primaryOk ? primary : ''} className="min-h-28" />
          <SwatchPanel label="Secondary" color={secondaryOk ? secondary : ''} className="min-h-28" />
        </div>
        <div className="space-y-4 p-4">
          <div>
            <h2
              className="font-serif text-3xl tracking-tight text-ink"
              style={{ fontFamily: defaultFont || undefined }}
            >
              {name.trim() || 'Brand name'}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {defaultFont ? `Typeface · ${defaultFont}` : 'Add a default font to preview it here.'}
            </p>
          </div>
          <LogoPreview key={logoUrl.trim()} url={logoUrl.trim()} />
        </div>
      </div>
    </aside>
  )
}

function SwatchPanel({ label, color, className }: { label: string; color: string; className?: string }) {
  const ink = color ? readableInk(color) : 'var(--bv-muted)'
  return (
    <div
      className={`flex flex-col justify-between p-4 ${className ?? ''}`}
      style={{
        background: color || 'var(--bv-muted-surface)',
        color: ink,
      }}
    >
      <span className="text-xs font-medium tracking-wide uppercase opacity-80">{label}</span>
      <span className="font-mono text-sm">{color || 'No color yet'}</span>
    </div>
  )
}

function LogoPreview({ url }: { url: string }) {
  const [failed, setFailed] = useState(false)

  if (!url) {
    return <p className="text-sm text-muted">Logo URL will show here.</p>
  }

  return (
    <div>
      <p className="text-xs font-medium tracking-[0.16em] text-muted uppercase">Logo</p>
      {failed ? (
        <p className="mt-2 text-sm text-muted">Logo couldn’t be previewed from that URL.</p>
      ) : (
        <div className="mt-2 inline-flex max-w-full rounded-xl bg-muted-surface p-3">
          <img
            src={url}
            alt="Brand logo"
            className="max-h-16 max-w-full object-contain"
            onError={() => setFailed(true)}
          />
        </div>
      )}
    </div>
  )
}
