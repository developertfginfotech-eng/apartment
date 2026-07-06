'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface TaxRate {
  id: number
  key: string
  value: string | number
  status: number
}

type ModalMode = 'add' | 'edit' | null

export default function TaxesPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [taxes, setTaxes] = useState<TaxRate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editTarget, setEditTarget] = useState<TaxRate | null>(null)
  const [form, setForm] = useState({ key: '', value: '', status: 1 })

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const fetchTaxes = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/wtax`, { headers: authHeaders() })
      const data = await res.json()
      setTaxes(Array.isArray(data) ? data : [])
    } catch { setError('Failed to load tax rates') }
    finally { setLoading(false) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchTaxes() }, [fetchTaxes])

  const openAdd = () => {
    setEditTarget(null)
    setForm({ key: '', value: '', status: 1 })
    setModalMode('add')
  }

  const openEdit = (tax: TaxRate) => {
    setEditTarget(tax)
    setForm({ key: tax.key, value: String(tax.value), status: tax.status })
    setModalMode('edit')
  }

  const closeModal = () => { setModalMode(null); setEditTarget(null) }

  const save = async () => {
    const val = parseFloat(form.value)
    if (!form.key || isNaN(val)) return

    try {
      if (modalMode === 'add') {
        await fetch(`${API}/wtax`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ key: form.key, value: val, status: form.status }) })
      } else if (modalMode === 'edit' && editTarget) {
        await fetch(`${API}/wtax/${editTarget.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ key: form.key, value: val, status: form.status }) })
      }
      closeModal()
      fetchTaxes()
    } catch { setError('Failed to save tax rate') }
  }

  const deleteTax = async (id: number) => {
    try {
      await fetch(`${API}/wtax/${id}`, { method: 'DELETE', headers: authHeaders() })
      fetchTaxes()
    } catch { setError('Failed to delete tax rate') }
  }

  const toggleStatus = async (tax: TaxRate) => {
    try {
      await fetch(`${API}/wtax/${tax.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status: tax.status === 1 ? 0 : 1 }) })
      fetchTaxes()
    } catch { setError('Failed to update status') }
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Withholding Tax</h1>
          <p className="af-db-subtitle">Tax rates applied to lease agreements</p>
        </div>
        <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none' }} onClick={openAdd}>
          + Add Tax Rate
        </button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading tax rates…</div>
      ) : (
        <div className="af-prop-table-wrap">
          <table className="af-prop-table">
            <thead>
              <tr>
                <th>Tax Name</th>
                <th>Rate (%)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {taxes.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>No tax rates found</td></tr>
              ) : taxes.map(tx => (
                <tr key={tx.id}>
                  <td style={{ fontWeight: 650 }}>{tx.key}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{Number(tx.value).toFixed(1)}%</td>
                  <td>
                    <button
                      onClick={() => toggleStatus(tx)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 100,
                        cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                        background: tx.status === 1 ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)',
                        color: tx.status === 1 ? '#22c55e' : '#64748b',
                      }}
                      title="Click to toggle"
                    >
                      <span style={{
                        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                        background: tx.status === 1 ? '#22c55e' : '#64748b',
                      }} />
                      {tx.status === 1 ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="af-btn-secondary"
                        style={{ cursor: 'pointer', padding: '5px 12px', fontSize: 12 }}
                        onClick={() => openEdit(tx)}
                      >
                        Edit
                      </button>
                      <button
                        style={{
                          cursor: 'pointer', padding: '5px 12px', fontSize: 12, borderRadius: 8,
                          border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.07)',
                          color: '#ef4444', fontFamily: 'inherit', fontWeight: 600,
                        }}
                        onClick={() => deleteTax(tx.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalMode !== null && (
        <div className="af-modal-overlay" onClick={closeModal}>
          <div className="af-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <h2 className="af-modal-title">{modalMode === 'add' ? 'Add Tax Rate' : 'Edit Tax Rate'}</h2>
            <div className="af-modal-form">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="af-field">
                  <label>Tax Name</label>
                  <input
                    type="text"
                    value={form.key}
                    onChange={e => setForm(f => ({ ...f, key: e.target.value }))}
                    placeholder="e.g. Standard WHT"
                  />
                </div>
                <div className="af-field">
                  <label>Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.value}
                    onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                    placeholder="e.g. 5.0"
                  />
                </div>
                <div className="af-field">
                  <label>Status</label>
                  <select
                    className="af-select"
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: Number(e.target.value) }))}
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={closeModal}>Cancel</button>
              <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save}>
                {modalMode === 'add' ? 'Add Rate' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
