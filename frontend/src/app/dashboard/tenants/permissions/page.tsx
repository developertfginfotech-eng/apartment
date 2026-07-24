'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
})

export default function RentersPermissionPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [catalog, setCatalog] = useState<string[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    (async () => {
      setLoading(true); setError('')
      try {
        const [catalogRes, grantedRes] = await Promise.all([
          fetch(`${API}/roles/permissions/catalog`, { headers: headers() }),
          fetch(`${API}/roles/permissions?role=renter`, { headers: headers() }),
        ])
        const catalogData: string[] = await catalogRes.json()
        const grantedData: string[] = await grantedRes.json()
        setCatalog(catalogData)
        setChecked(new Set(grantedData))
      } catch {
        setError('Failed to load permissions')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const toggle = (permission: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(permission)) next.delete(permission)
      else next.add(permission)
      return next
    })
  }

  const save = async () => {
    setSaving(true); setError(''); setMessage('')
    try {
      const res = await fetch(`${API}/roles/permissions?role=renter`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ permissions: Array.from(checked) }),
      })
      if (!res.ok) throw new Error()
      setMessage('User Role Updated Successfully')
    } catch {
      setError('Failed to save permissions')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Give Permission To Renter</h1>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/tenants')}>← Back to Renters</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}
      {message && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#22c55e', fontSize: 13 }}>{message}</div>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 750, marginBottom: 18 }}>Permissions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px 20px' }}>
          {catalog.map(p => (
            <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer' }}>
              <input type="checkbox" checked={checked.has(p)} onChange={() => toggle(p)} />
              {p}
            </label>
          ))}
        </div>
        <div style={{ marginTop: 22 }}>
          <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </main>
  )
}
