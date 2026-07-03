'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form     = e.currentTarget
    const email    = (form.elements.namedItem('email')    as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    try {
      const res  = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : (data.message ?? 'Login failed')
        throw new Error(msg)
      }
      localStorage.setItem('apt_token', data.token)
      localStorage.setItem('apt_user',  JSON.stringify(data.user))
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="af-auth-page">
      <Link className="af-auth-back" href="/">
        ← Back to home
      </Link>

      <div className="af-auth-card">
        <Link className="af-auth-logo" href="/">
          <div className="af-nav-icon">AP</div>
          Apartment
        </Link>

        <h1 className="af-auth-h1">Welcome back</h1>
        <p className="af-auth-sub">Sign in to your property dashboard.</p>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: 9,
            padding: '10px 14px',
            fontSize: 13,
            color: '#f87171',
            marginBottom: 12,
          }}>
            {error}
          </div>
        )}

        <form className="af-auth-form" onSubmit={handleSubmit}>
          <div className="af-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="you@company.com" required autoComplete="email"/>
          </div>
          <div className="af-field">
            <label htmlFor="password">
              Password
              <Link href="/reset-password" style={{float:'right',fontSize:'11.5px',color:'var(--accent)',fontWeight:500,textDecoration:'none'}}>Forgot password?</Link>
            </label>
            <input id="password" type="password" placeholder="Your password" required autoComplete="current-password"/>
          </div>
          <button type="submit" className="af-auth-submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        <p className="af-auth-switch" style={{ marginTop: 18 }}>
          Access is by invitation. Contact your administrator for an account.
        </p>
      </div>
    </div>
  )
}
