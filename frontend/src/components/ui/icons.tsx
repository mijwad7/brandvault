import type { ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

export type IconName =
  | 'alert'
  | 'chevron'
  | 'external'
  | 'file'
  | 'film'
  | 'folder'
  | 'image'
  | 'layers'
  | 'logout'
  | 'moon'
  | 'palette'
  | 'plus'
  | 'search'
  | 'sun'
  | 'trash'
  | 'type'
  | 'undo'
  | 'user'
  | 'check'
  | 'x'

const paths: Record<IconName, ReactNode> = {
  alert: (
    <>
      <path d="M12 4 3.5 19h17L12 4Z" />
      <path d="M12 10v4" />
      <path d="M12 16.5h.01" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
  external: (
    <>
      <path d="M10 6H6.5A1.5 1.5 0 0 0 5 7.5v10A1.5 1.5 0 0 0 6.5 19h10a1.5 1.5 0 0 0 1.5-1.5V14" />
      <path d="M13 5h6v6" />
      <path d="m12 12 7-7" />
    </>
  ),
  file: (
    <>
      <path d="M7 3.5h6.5L19 9v10.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19.5v-14A1.5 1.5 0 0 1 7.5 4Z" />
      <path d="M13.5 3.5V9H19" />
    </>
  ),
  film: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="M8 5v14M16 5v14M3.5 9H8M3.5 15H8M16 9h4.5M16 15h4.5" />
    </>
  ),
  folder: (
    <path d="M3.5 8.2V17.5A1.5 1.5 0 0 0 5 19h14a1.5 1.5 0 0 0 1.5-1.5V9.2A1.5 1.5 0 0 0 19 7.7h-6.2L11 5.5H5A1.5 1.5 0 0 0 3.5 7v1.2Z" />
  ),
  image: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.1" fill="currentColor" stroke="none" />
      <path d="m4.5 16 4.2-3.8 2.8 2.6L15 11l4.5 4.5" />
    </>
  ),
  layers: (
    <>
      <path d="m12 4 8 4-8 4-8-4 8-4Z" />
      <path d="m4 12 8 4 8-4" />
      <path d="m4 16 8 4 8-4" />
    </>
  ),
  logout: (
    <>
      <path d="M10 7V5.5A1.5 1.5 0 0 1 11.5 4H18a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 18 20h-6.5A1.5 1.5 0 0 1 10 18.5V17" />
      <path d="M13 12H4" />
      <path d="M6.5 9.5 4 12l2.5 2.5" />
    </>
  ),
  moon: <path d="M16 3.6A7.2 7.2 0 1 0 20.4 13 6.2 6.2 0 0 1 16 3.6Z" />,
  palette: (
    <>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17h1.1a1.8 1.8 0 0 0 1.3-3.1 2.2 2.2 0 0 1 1.6-3.7H17a4.6 4.6 0 0 0 .4-9.1A8.5 8.5 0 0 0 12 3.5Z" />
      <circle cx="8" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="10.2" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m15.5 15.5 4 4" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M5.8 5.8l1.4 1.4M16.8 16.8l1.4 1.4M18.2 5.8l-1.4 1.4M7.2 16.8l-1.4 1.4" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15" />
      <path d="M9 7V5h6v2" />
      <path d="M7.5 7.5 8.2 19h7.6l.7-11.5" />
    </>
  ),
  type: (
    <>
      <path d="M5 19 12 5l7 14" />
      <path d="M8.2 14h7.6" />
    </>
  ),
  undo: (
    <>
      <path d="M4 8.5h8.5a5 5 0 1 1 0 10H8" />
      <path d="M7 5.5 4 8.5l3 3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="9" r="3" />
      <path d="M6.5 19.2c1-2.6 2.8-3.7 5.5-3.7s4.5 1.1 5.5 3.7" />
    </>
  ),
  check: <path d="m5 12.5 4.2 4.2L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
}

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('size-5 shrink-0', className)}
    >
      {paths[name]}
    </svg>
  )
}
