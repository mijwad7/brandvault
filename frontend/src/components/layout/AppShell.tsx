import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth.ts'
import { BrandKitProvider } from '../../features/brand/BrandKitProvider.tsx'
import { useBrandKit } from '../../features/brand/useBrandKit.ts'
import { isHexColor, readableInk } from '../../lib/color.ts'
import { cn } from '../../lib/cn.ts'
import { getSupabase } from '../../lib/supabase.ts'
import { ThemeToggle } from '../theme/ThemeToggle.tsx'
import { Button } from '../ui/Button.tsx'
import { Dialog } from '../ui/Dialog.tsx'
import { Icon, type IconName } from '../ui/icons.tsx'
import { Mark } from '../ui/Mark.tsx'

const links: Array<{ to: string; label: string; icon: IconName }> = [
  { to: '/library', label: 'Library', icon: 'layers' },
  { to: '/brand', label: 'Brand', icon: 'palette' },
  { to: '/trash', label: 'Trash', icon: 'trash' },
]

export function AppShell() {
  return (
    <BrandKitProvider>
      <ShellFrame />
    </BrandKitProvider>
  )
}

function ShellFrame() {
  const { session } = useAuth()
  const { brand } = useBrandKit()
  const [accountOpen, setAccountOpen] = useState(false)
  const primary = brand && isHexColor(brand.primary_color) ? brand.primary_color : null
  const secondary = brand && isHexColor(brand.secondary_color) ? brand.secondary_color : null
  const email = session?.user.email ?? ''

  async function signOut() {
    await getSupabase()?.auth.signOut()
  }

  return (
    <div className="min-h-svh bg-bg text-ink md:flex">
      <aside className="sticky top-0 z-30 hidden h-svh w-60 shrink-0 flex-col border-r border-line bg-surface px-4 py-5 md:flex">
        <div className="flex items-center gap-2.5 px-1">
          <span className="relative">
            <Mark color={primary} ink={primary ? readableInk(primary) : null} />
            {secondary ? (
              <span
                className="absolute -right-1 -bottom-1 size-3 rounded-full border-2 border-surface"
                style={{ backgroundColor: secondary }}
              />
            ) : null}
          </span>
          <p className="font-serif text-xl tracking-tight">BrandVault</p>
        </div>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Primary">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                  isActive ? 'bg-muted-surface text-ink' : 'text-muted hover:bg-muted-surface hover:text-ink',
                )
              }
              style={({ isActive }) =>
                isActive
                  ? { boxShadow: 'inset 3px 0 0 var(--brand-primary, var(--bv-accent))' }
                  : undefined
              }
            >
              <Icon name={link.icon} />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3 border-t border-line pt-4">
          <p className="truncate px-1 text-xs text-muted" title={email}>
            {email}
          </p>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="secondary" className="h-11 flex-1" onClick={() => void signOut()}>
              <Icon name="logout" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <Mark color={primary} ink={primary ? readableInk(primary) : null} />
            <p className="font-serif text-lg tracking-tight">BrandVault</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              className="grid size-11 place-items-center rounded-xl border border-line bg-surface text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-label="Account"
              onClick={() => setAccountOpen(true)}
            >
              <Icon name="user" />
            </button>
          </div>
        </header>

        <main
          id="content"
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-28 md:px-8 md:py-8 md:pb-10"
        >
          <Outlet />
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur md:hidden"
        aria-label="Primary"
      >
        <div className="grid grid-cols-3 pb-[env(safe-area-inset-bottom)]">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent',
                  isActive ? 'text-ink' : 'text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={link.icon} className={isActive ? 'text-ink' : undefined} />
                  <span
                    className="h-1 w-1 rounded-full"
                    style={{
                      background: isActive ? 'var(--brand-primary, var(--bv-accent))' : 'transparent',
                    }}
                  />
                  {link.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <Dialog
        open={accountOpen}
        title="Account"
        description={email}
        onClose={() => setAccountOpen(false)}
      >
        <Button className="w-full" variant="secondary" onClick={() => void signOut()}>
          <Icon name="logout" />
          Sign out
        </Button>
      </Dialog>
    </div>
  )
}
