'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface TaxRate {
  id: number
  key: string
  value: string | number
}

export default function TaxForm({ taxId }: { taxId?: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [form, setForm] = useState({ key: '', value: '' })
  const [loading, setLoading] = useState(!!taxId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  useEffect(() => {
    if (!taxId) return
    (async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/tax`, { headers: authHeaders() })
        const data = await res.json()
        const tax: TaxRate | undefined = Array.isArray(data) ? data.find((t: TaxRate) => t.id === taxId) : undefined
        if (tax) {
          setForm({ key: tax.key, value: String(tax.value) })
        } else {
          setError('Tax not found')
        }
      } catch { setError('Failed to load tax') }
      finally { setLoading(false) }
    })()
  }, [taxId]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    const val = parseFloat(form.value)
    if (!form.key || isNaN(val)) return
    setSaving(true); setError('')
    try {
      if (taxId) {
        await fetch(`${API}/tax/${taxId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ key: form.key, value: val }) })
      } else {
        await fetch(`${API}/tax`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ key: form.key, value: val }) })
      }
      router.push('/dashboard/taxes')
    } catch { setError(taxId ? 'Failed to update tax' : 'Failed to create tax') }
    finally { setSaving(false) }
  }

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>{taxId ? 'Edit Tax' : 'Add Tax'}</h1>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/taxes')}>← Back to Taxes</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 440 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="af-field">
            <label>Name</label>
            <input
              type="text"
              value={form.key}
              onChange={e => setForm(f => ({ ...f, key: e.target.value }))}
              placeholder="e.g. LEASE TAX"
            />
          </div>
          <div className="af-field">
            <label>Tax(%)</label>
            <input
              type="number"
              step="0.01"
              value={form.value}
              onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              placeholder="e.g. 10.00"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/taxes')} disabled={saving}>Cancel</button>
          <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : taxId ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </main>
  )
}
