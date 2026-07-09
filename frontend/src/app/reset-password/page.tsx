'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from '../../lib/useTheme'
import SparkleField from '../../components/SparkleField'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function ResetPasswordPage() {
  const router = useRouter()
  useTheme() // syncs the persisted light/dark preference on load (this page has no toggle of its own)
  const [step, setStep]         = useState<'form' | 'done'>('form')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [email, setEmail]       = useState('')
  const [newPwd, setNewPwd]     = useState('')
  const [confirmPwd, setConfirm] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPwd.length < 6) { setError('Password must be at least 6 characters'); return }
    if (newPwd !== confirmPwd) { setError('Passwords do not match'); return }

    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword: newPwd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Reset failed')
      if (!data.ok) throw new Error('No account found with that email address')
      setStep('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="af-auth-page">
      <SparkleField themed />
      <Link className="af-auth-back" href="/login">← Back to login</Link>

      <div className="af-auth-card">
        <Link className="af-auth-logo" href="/">
          <img src="/logo.jpeg" alt="Apartment" className="af-nav-icon" />
          Apartment
        </Link>

        {step === 'done' ? (
          <>
            <h1 className="af-auth-h1">Password reset</h1>
            <p className="af-auth-sub" style={{ marginBottom: 28 }}>
              Your password has been updated. You can now sign in with your new password.
            </p>
            <button
              className="af-auth-submit"
              onClick={() => router.push('/login')}
            >
              Go to sign in →
            </button>
          </>
        ) : (
          <>
            <h1 className="af-auth-h1">Reset password</h1>
            <p className="af-auth-sub">Enter your email and choose a new password.</p>

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
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div className="af-field">
                <label htmlFor="newpwd">New password</label>
                <input
                  id="newpwd"
                  type="password"
                  placeholder="At least 6 characters"
                  required
                  autoComplete="new-password"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                />
              </div>
              <div className="af-field">
                <label htmlFor="confirmpwd">Confirm new password</label>
                <input
                  id="confirmpwd"
                  type="password"
                  placeholder="Repeat your new password"
                  required
                  autoComplete="new-password"
                  value={confirmPwd}
                  onChange={e => setConfirm(e.target.value)}
                />
              </div>
              <button type="submit" className="af-auth-submit" disabled={loading}>
                {loading ? 'Resetting…' : 'Reset password →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
