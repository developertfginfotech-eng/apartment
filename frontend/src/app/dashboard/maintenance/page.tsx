'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Maintenance {
  id: number
  property_id: number
  type: string
  title: string
  amount: number
  date: string
  month: number
  year: number
  description: string
  status: number
}

const TYPE_OPTIONS = ['plumbing', 'electrical', 'aircon', 'painting', 'general']

const STATUS_STYLE: Record<number, { bg: string; color: string; label: string }> = {
  1: { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', label: 'Active' },
  0: { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: 'Inactive' },
}

const EMPTY_FORM = {
  type: 'plumbing',
  title: '',
  amount: '',
  date: '',
  description: '',
  property_id: '',
}

export default function MaintenancePage() {
  const router = useRouter()

  const [records, setRecords]     = useState<Maintenance[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState<Maintenance | null>(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    if (!localStorage.getItem('apt_token')) router.push('/login')
  }, [router])

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/maintenance`, { headers: authHeaders() })
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      const data = await res.json()
      setRecords(Array.isArray(data) ? data : data.data ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load maintenance records')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const openCreate = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (r: Maintenance) => {
    setEditTarget(r)
    setForm({
      type: r.type,
      title: r.title,
      amount: String(r.amount),
      date: r.date ? r.date.slice(0, 10) : '',
      description: r.description ?? '',
      property_id: String(r.property_id),
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditTarget(null)
    setForm(EMPTY_FORM)
  }

  const saveRecord = async () => {
    if (!form.title || !form.property_id || !form.date) return
    setSaving(true)
    setError('')
    try {
      const dateObj = new Date(form.date)
      const body = {
        type: form.type,
        title: form.title,
        amount: parseFloat(form.amount) || 0,
        date: form.date,
        month: dateObj.getMonth() + 1,
        year: dateObj.getFullYear(),
        description: form.description,
        property_id: parseInt(form.property_id, 10),
        status: 1,
      }

      const url = editTarget
        ? `${API}/maintenance/${editTarget.id}`
        : `${API}/maintenance`
      const method = editTarget ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      closeForm()
      await fetchRecords()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save record')
    } finally {
      setSaving(false)
    }
  }

  const deleteRecord = async (id: number) => {
    if (!confirm('Delete this maintenance record?')) return
    setError('')
    try {
      const res = await fetch(`${API}/maintenance/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
      await fetchRecords()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete record')
    }
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Maintenance</h1>
          <p className="af-db-subtitle">
            {loading ? 'Loading…' : `${records.filter(r => r.status === 1).length} active record${records.filter(r => r.status === 1).length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button className="af-btn-primary" onClick={openCreate} style={{ cursor: 'pointer', border: 'none' }}>
          + New Record
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 18, color: '#ef4444', fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
          Loading maintenance records…
        </div>
      ) : records.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
          No maintenance records found.
        </div>
      ) : (
        <div className="af-prop-table-wrap">
          <table className="af-prop-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Property ID</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => {
                const st = STATUS_STYLE[r.status] ?? STATUS_STYLE[0]
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 650 }}>{r.title}</td>
                    <td style={{ textTransform: 'capitalize' }}>{r.type}</td>
                    <td>{r.property_id}</td>
                    <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      ${Number(r.amount).toLocaleString()}
                    </td>
                    <td style={{ fontSize: 13 }}>{r.date ? r.date.slice(0, 10) : '—'}</td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100, background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="af-prop-act edit" onClick={() => openEdit(r)}>Edit</button>
                      <button className="af-prop-act delete" onClick={() => deleteRecord(r.id)}>Delete</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="af-modal-overlay" onClick={closeForm}>
          <div className="af-modal" onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">{editTarget ? 'Edit Maintenance Record' : 'New Maintenance Record'}</h2>
            <div className="af-modal-form">
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
                    {TYPE_OPTIONS.map(t => (
                      <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
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
            </div>
            {error && (
              <div style={{ color: '#ef4444', fontSize: 12.5, marginTop: 10 }}>{error}</div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={closeForm} disabled={saving}>
                Cancel
              </button>
              <button
                className="af-auth-submit"
                style={{ width: 'auto', padding: '10px 24px', opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
                onClick={saveRecord}
                disabled={saving}
              >
                {saving ? 'Saving…' : editTarget ? 'Save changes' : 'Create record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
