import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { FullScreenStatus } from '../../components/layout/FullScreenStatus.tsx'
import { ThemeToggle } from '../../components/theme/ThemeToggle.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { FormAlert, TextField } from '../../components/ui/Field.tsx'
import { Mark } from '../../components/ui/Mark.tsx'
import { isSupabaseConfigured } from '../../lib/env.ts'
import { getSupabase } from '../../lib/supabase.ts'
import { useAuth } from './useAuth.ts'

export function LoginPage() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState<'signin' | 'signup' | null>(null)

  if (loading) {
    return <FullScreenStatus label="Checking your session" />
  }

  if (session) {
    return <Navigate to="/library" replace />
  }

  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center bg-bg px-6 text-ink">
        <Mark />
        <h1 className="mt-4 font-serif text-3xl tracking-tight">BrandVault</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Supabase Auth is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to
          frontend/.env, then restart the dev server.
        </p>
      </main>
    )
  }

  async function authenticate(mode: 'signin' | 'signup') {
    const supabase = getSupabase()
    if (!supabase) {
      return
    }

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setError('Enter an email and password first.')
      return
    }

    setPending(mode)
    setError('')
    const { data, error: authError } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password,
          })
        : await supabase.auth.signUp({ email: trimmedEmail, password })
    setPending(null)
    if (authError) {
      setError(authError.message)
      return
    }
    if (mode === 'signup' && !data.session) {
      setError('Account created. Confirm the email in Supabase, then sign in.')
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void authenticate('signin')
  }

  return (
    <main className="relative min-h-svh bg-bg text-ink">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div className="mx-auto grid min-h-svh max-w-6xl md:grid-cols-2">
        <section className="flex flex-col justify-end px-6 pt-20 pb-6 md:justify-center md:px-12 md:py-16">
          <div className="flex items-center gap-2.5">
            <Mark />
            <p className="text-sm font-medium tracking-wide text-muted">BrandVault</p>
          </div>
          <h1 className="mt-5 max-w-md font-serif text-4xl leading-[1.05] tracking-tight md:text-5xl">
            A library for the brand, not a pile of files.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            One workspace. The brand kit, folders, and assets live here together.
          </p>
          <div className="mt-10 hidden items-end gap-3 md:flex" aria-hidden="true">
            <div className="h-28 w-16 rounded-2xl bg-accent" />
            <div className="h-20 w-16 rounded-2xl bg-clay" />
            <div className="h-24 w-14 rounded-2xl border border-line bg-surface" />
          </div>
        </section>

        <section className="flex items-start px-4 pb-10 md:items-center md:px-10">
          <form
            className="w-full rounded-3xl border border-line bg-surface p-5 shadow-xl md:p-8"
            onSubmit={onSubmit}
          >
            <h2 className="font-serif text-2xl tracking-tight">Sign in</h2>
            <p className="mt-1 text-sm text-muted">Use your workspace email and password.</p>
            <div className="mt-6 space-y-4">
              <TextField
                label="Email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                aria-invalid={error ? true : undefined}
              />
              <TextField
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                aria-invalid={error ? true : undefined}
              />
              <FormAlert message={error} />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="w-full" type="submit" disabled={pending !== null}>
                  {pending === 'signin' ? 'Signing in…' : 'Sign in'}
                </Button>
                <Button
                  className="w-full"
                  variant="secondary"
                  disabled={pending !== null}
                  onClick={() => {
                    void authenticate('signup')
                  }}
                >
                  {pending === 'signup' ? 'Creating account…' : 'Sign up'}
                </Button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
