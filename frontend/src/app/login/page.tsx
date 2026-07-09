'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from '../../lib/useTheme'
import SparkleField from '../../components/SparkleField'

function newCaptcha() {
  const ops = ['+', '-', '*'] as const
  const op  = ops[Math.floor(Math.random() * ops.length)]
  let a = Math.floor(Math.random() * 12) + 1
  let b = Math.floor(Math.random() * 12) + 1
  if (op === '-' && b > a) [a, b] = [b, a]
  const answer = op === '+' ? a + b : op === '-' ? a - b : a * b
  return { question: `${a} ${op} ${b}`, answer }
}

export default function LoginPage() {
  const router = useRouter()
  useTheme() // syncs the persisted light/dark preference on load (this page has no toggle of its own)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [captcha, setCaptcha]   = useState(newCaptcha)
  const [captchaVal, setCaptchaVal] = useState('')
  const [captchaErr, setCaptchaErr] = useState(false)

  const refreshCaptcha = useCallback(() => {
    setCaptcha(newCaptcha())
    setCaptchaVal('')
    setCaptchaErr(false)
  }, [])

  // Refresh captcha on mount so it's different every page load
  useEffect(() => { refreshCaptcha() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (parseInt(captchaVal, 10) !== captcha.answer) {
      setCaptchaErr(true)
      refreshCaptcha()
      return
    }

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
      refreshCaptcha()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="af-auth-page">
      <SparkleField themed />
      <Link className="af-auth-back" href="/">← Back to home</Link>

      <div className="af-auth-card">
        <Link className="af-auth-logo" href="/">
          <img src="/logo.jpeg" alt="Apartment" className="af-nav-icon" />
          Apartment
        </Link>

        <h1 className="af-auth-h1">Welcome back</h1>
        <p className="af-auth-sub">Sign in to your property dashboard.</p>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: 9, padding: '10px 14px',
            fontSize: 13, color: '#f87171', marginBottom: 12,
          }}>
            {error}
          </div>
        )}

        <form className="af-auth-form" onSubmit={handleSubmit}>
          {/* Email */}
          <div className="af-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="you@company.com" required autoComplete="email"/>
          </div>

          {/* Password with eye toggle */}
          <div className="af-field">
            <label htmlFor="password">
              Password
              <Link href="/reset-password" style={{float:'right',fontSize:'11.5px',color:'var(--accent)',fontWeight:500,textDecoration:'none'}}>
                Forgot password?
              </Link>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                placeholder="Your password"
                required
                autoComplete="current-password"
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: 'var(--muted)', display: 'flex', alignItems: 'center',
                }}
              >
                {showPwd ? (
                  /* eye-off */
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  /* eye */
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* CAPTCHA */}
          <div className="af-field">
            <label>
              Verify you&apos;re human
              <button
                type="button"
                onClick={refreshCaptcha}
                style={{
                  float: 'right', background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--accent)', fontSize: 11.5, fontWeight: 500, padding: 0,
                  fontFamily: 'inherit',
                }}
              >
                ↻ New question
              </button>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                background: 'var(--surface2)',
                border: `1px solid ${captchaErr ? 'rgba(239,68,68,0.5)' : 'var(--border2)'}`,
                borderRadius: 9, padding: '10px 18px',
                fontSize: 17, fontWeight: 700, letterSpacing: '0.08em',
                color: 'var(--accent)', flexShrink: 0,
                fontFamily: 'monospace', userSelect: 'none',
              }}>
                {captcha.question} = ?
              </div>
              <input
                type="number"
                value={captchaVal}
                onChange={e => { setCaptchaVal(e.target.value); setCaptchaErr(false) }}
                placeholder="Answer"
                required
                style={{
                  flex: 1,
                  borderColor: captchaErr ? 'rgba(239,68,68,0.6)' : undefined,
                }}
              />
            </div>
            {captchaErr && (
              <div style={{ color: '#f87171', fontSize: 12, marginTop: 5 }}>
                Incorrect — try the new question
              </div>
            )}
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
