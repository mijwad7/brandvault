import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthProvider.tsx'
import { getSupabase } from '../../lib/supabase.ts'

const links = [
  { to: '/brand', label: 'Brand' },
  { to: '/library', label: 'Library' },
  { to: '/trash', label: 'Trash' },
]

export function AppShell() {
  const { session } = useAuth()

  async function signOut() {
    await getSupabase()?.auth.signOut()
  }

  return (
    <div className="min-h-svh bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold">BrandVault</span>
          <nav className="flex gap-4 text-sm">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  isActive ? 'font-medium text-slate-900' : 'text-slate-500'
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">{session?.user.email}</span>
          <button
            className="rounded border border-slate-300 px-2 py-1"
            type="button"
            onClick={() => {
              void signOut()
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
