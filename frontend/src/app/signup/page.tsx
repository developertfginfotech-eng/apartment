'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form     = e.currentTarget
    const name     = (form.elements.namedItem('name')     as HTMLInputElement).value
    const email    = (form.elements.namedItem('email')    as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    try {
      const res  = await fetch('http://localhost:3000/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : (data.message ?? 'Registration failed')
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

        <h1 className="af-auth-h1">Create your account</h1>
        <p className="af-auth-sub">Start managing your properties visually — free forever for small teams.</p>

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
            <label htmlFor="name">Full name</label>
            <input id="name" type="text" placeholder="John Smith" required autoComplete="name"/>
          </div>
          <div className="af-field">
            <label htmlFor="email">Work email</label>
            <input id="email" type="email" placeholder="you@company.com" required autoComplete="email"/>
          </div>
          <div className="af-field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" placeholder="8+ characters" required autoComplete="new-password" minLength={8}/>
          </div>
          <button type="submit" className="af-auth-submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account →'}
          </button>
        </form>

        <div className="af-auth-divider"><span>or</span></div>

        <button className="af-auth-oauth" type="button">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M17.64 9.2a10.3 10.3 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A8.99 8.99 0 0 0 9 18Z" fill="#34A853"/>
            <path d="M3.97 10.71A5.41 5.41 0 0 1 3.69 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33Z" fill="#FBBC05"/>
            <path d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58C13.46.89 11.43 0 9 0A8.99 8.99 0 0 0 .96 4.96L3.97 7.3C4.68 5.16 6.66 3.58 9 3.58Z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="af-auth-switch">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
