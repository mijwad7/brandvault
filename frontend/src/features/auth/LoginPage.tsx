import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { isSupabaseConfigured } from '../../lib/env.ts'
import { getSupabase } from '../../lib/supabase.ts'
import { useAuth } from './AuthProvider.tsx'

export function LoginPage() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (loading) {
    return <p className="p-6 text-sm text-slate-500">Loading session…</p>
  }

  if (session) {
    return <Navigate to="/library" replace />
  }

  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-md p-8">
        <h1 className="text-2xl font-semibold">BrandVault</h1>
        <p className="mt-4 text-sm text-slate-600">
          Supabase Auth is not configured. Add `VITE_SUPABASE_URL` and
          `VITE_SUPABASE_ANON_KEY` to `frontend/.env`.
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

    setPending(true)
    setError('')
    const { data, error: authError } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password,
          })
        : await supabase.auth.signUp({ email: trimmedEmail, password })
    setPending(false)
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
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold">BrandVault</h1>
      <p className="mt-2 text-sm text-slate-600">Sign in to your workspace.</p>
      <form className="mt-6 space-y-3" onSubmit={onSubmit}>
        <label className="block text-sm">
          Email
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex gap-2">
          <button
            className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
            type="submit"
            disabled={pending}
          >
            Sign in
          </button>
          <button
            className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
            type="button"
            disabled={pending}
            onClick={() => {
              void authenticate('signup')
            }}
          >
            Sign up
          </button>
        </div>
      </form>
    </main>
  )
}
