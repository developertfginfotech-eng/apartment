'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

const EMPTY_FORM = { name: '', address: '', tin: '', phone: '', email: '' }

export default function VendorForm({ vendorId }: { vendorId?: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(!!vendorId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  useEffect(() => {
    if (!vendorId) return
    (async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/vendors/${vendorId}`, { headers: authHeaders() })
        if (!res.ok) throw new Error()
        const v = await res.json()
        setForm({
          name: v.name ?? '',
          address: v.address ?? '',
          tin: v.tin ?? '',
          phone: v.phone ?? '',
          email: v.email ?? '',
        })
      } catch { setError('Failed to load vendor') }
      finally { setLoading(false) }
    })()
  }, [vendorId]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!form.name) return
    setSaving(true); setError('')
    try {
      const url = vendorId ? `${API}/vendors/${vendorId}` : `${API}/vendors`
      const method = vendorId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      router.push('/dashboard/vendors')
    } catch { setError(vendorId ? 'Failed to update vendor' : 'Failed to create vendor') }
    finally { setSaving(false) }
  }

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>{vendorId ? 'Edit Vendor' : 'New Vendor'}</h1>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/vendors')}>← Back to Vendors</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 820 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="af-field" style={{ gridColumn: 'span 2' }}>
            <label>Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Vendor name" autoFocus/>
          </div>
          <div className="af-field" style={{ gridColumn: 'span 2' }}>
            <label>Address</label>
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Address"/>
          </div>
          <div className="af-field">
            <label>TIN</label>
            <input value={form.tin} onChange={e => setForm(f => ({ ...f, tin: e.target.value }))} placeholder="000-000-000-000"/>
          </div>
          <div className="af-field">
            <label>Phone</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number"/>
          </div>
          <div className="af-field" style={{ gridColumn: 'span 2' }}>
            <label>Email</label>
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="vendor@email.com"/>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/vendors')} disabled={saving}>Cancel</button>
          <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : vendorId ? 'Save changes' : 'Create vendor'}
          </button>
        </div>
      </div>
    </main>
  )
}
