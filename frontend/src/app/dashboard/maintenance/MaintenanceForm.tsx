'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface MaintenanceType { id: number; name: string }

const EMPTY_FORM = {
  type: '',
  title: '',
  amount: '',
  date: '',
  description: '',
  property_id: '',
}

export default function MaintenanceForm({ maintenanceId }: { maintenanceId?: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [types, setTypes] = useState<MaintenanceType[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(!!maintenanceId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  useEffect(() => {
    fetch(`${API}/maintenance-type`, { headers: authHeaders() })
      .then(r => r.json()).then(d => Array.isArray(d) && setTypes(d)).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadRecord = useCallback(async (id: number) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/maintenance/${id}`, { headers: authHeaders() })
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      const r = await res.json()
      setForm({
        type: String(r.type_id ?? r.type ?? ''),
        title: r.title ?? '',
        amount: String(r.amount ?? ''),
        date: r.date ? r.date.slice(0, 10) : '',
        description: r.description ?? '',
        property_id: String(r.property_id ?? ''),
      })
    } catch {
      setError('Failed to load maintenance record')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!maintenanceId) return
    loadRecord(maintenanceId)
  }, [maintenanceId, loadRecord])

  const save = async () => {
    if (!form.title || !form.property_id || !form.date) return
    setSaving(true)
    setError('')
    try {
      const dateObj = new Date(form.date)
      const body = {
        type: form.type ? parseInt(form.type, 10) : null,
        title: form.title,
        amount: parseFloat(form.amount) || 0,
        date: form.date,
        month: dateObj.getMonth() + 1,
        year: dateObj.getFullYear(),
        description: form.description,
        property_id: parseInt(form.property_id, 10),
        status: 1,
      }

      const url = maintenanceId ? `${API}/maintenance/${maintenanceId}` : `${API}/maintenance`
      const method = maintenanceId ? 'PUT' : 'POST'

      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      router.push('/dashboard/maintenance')
    } catch {
      setError(maintenanceId ? 'Failed to update record' : 'Failed to save record')
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
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>{maintenanceId ? 'Edit Maintenance Record' : 'New Maintenance Record'}</h1>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/maintenance')}>← Back to Maintenance</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 820 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="af-field" style={{ gridColumn: '1 / -1' }}>
            <label>Title</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Replace kitchen faucet"
            />
          </div>
          <div className="af-field">
            <label>Type</label>
            <select className="af-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="">-- Select Type --</option>
              {types.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="af-field">
            <label>Property ID</label>
            <input
              type="number"
              value={form.property_id}
              onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
              placeholder="1"
            />
          </div>
          <div className="af-field">
            <label>Amount</label>
            <input
              type="number"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          <div className="af-field">
            <label>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div className="af-field" style={{ gridColumn: '1 / -1' }}>
            <label>Description</label>
            <input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional details…"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/maintenance')} disabled={saving}>Cancel</button>
          <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : maintenanceId ? 'Save changes' : 'Create record'}
          </button>
        </div>
      </div>
    </main>
  )
}
