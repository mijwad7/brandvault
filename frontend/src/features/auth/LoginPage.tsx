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

// Published assignment demo account. Django still requires the Supabase JWT.
const DEMO_EMAIL = 'demo@brandvault.dev'
const DEMO_PASSWORD = 'Demo1234!'

export function LoginPage() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState<'signin' | 'signup' | 'demo' | 'google' | null>(null)

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

  async function continueAsDemo() {
    const supabase = getSupabase()
    if (!supabase) {
      return
    }
    setPending('demo')
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    })
    setPending(null)
    if (authError) {
      setError(authError.message)
    }
  }

  async function continueWithGoogle() {
    const supabase = getSupabase()
    if (!supabase) {
      return
    }
    setPending('google')
    setError('')
    try {
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true,
        },
      })
      if (authError) {
        setError(authError.message)
        setPending(null)
        return
      }
      if (!data.url) {
        setError('Google sign-in did not return a redirect.')
        setPending(null)
        return
      }
      const probe = await fetch(data.url, { redirect: 'manual' })
      if (probe.type === 'opaqueredirect' || (probe.status >= 300 && probe.status < 400)) {
        window.location.assign(data.url)
        return
      }
      if (!probe.ok) {
        const body: unknown = await probe.json().catch(() => null)
        const raw =
          body && typeof body === 'object' && 'msg' in body && typeof body.msg === 'string'
            ? body.msg
            : 'Google sign-in is not available. Enable the Google provider in Supabase.'
        const message = raw.toLowerCase().includes('not enabled')
          ? 'Google sign-in is not enabled. Turn on the Google provider in Supabase.'
          : raw
        setError(message)
        setPending(null)
        return
      }
      window.location.assign(data.url)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Google sign-in failed.')
      setPending(null)
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
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-line" />
                or
                <span className="h-px flex-1 bg-line" />
              </div>
              <Button
                className="w-full"
                variant="secondary"
                disabled={pending !== null}
                onClick={() => {
                  void continueAsDemo()
                }}
              >
                {pending === 'demo' ? 'Signing in…' : 'Continue as demo'}
              </Button>
              <Button
                className="w-full"
                variant="secondary"
                disabled={pending !== null}
                onClick={() => {
                  void continueWithGoogle()
                }}
              >
                {pending === 'google' ? 'Redirecting…' : 'Continue with Google'}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
