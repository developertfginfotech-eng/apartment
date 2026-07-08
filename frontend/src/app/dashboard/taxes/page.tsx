'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Pagination, { usePagination } from '@/components/Pagination'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface TaxRate {
  id: number
  key: string
  value: string | number
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
  const [form, setForm] = useState({ key: '', value: '' })
  const [limit, setLimit] = useState(50)
  const [search, setSearch] = useState('')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const fetchTaxes = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/tax`, { headers: authHeaders() })
      const data = await res.json()
      setTaxes(Array.isArray(data) ? data : [])
    } catch { setError('Failed to load taxes') }
    finally { setLoading(false) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchTaxes() }, [fetchTaxes])

  const openAdd = () => {
    setEditTarget(null)
    setForm({ key: '', value: '' })
    setModalMode('add')
  }

  const openEdit = (tax: TaxRate) => {
    setEditTarget(tax)
    setForm({ key: tax.key, value: String(tax.value) })
    setModalMode('edit')
  }

  const closeModal = () => { setModalMode(null); setEditTarget(null) }

  const filteredTaxes = taxes
    .filter(tx => tx.key.toLowerCase().includes(search.toLowerCase()))
    .slice(0, limit)
  const { page, setPage, pageSize, pageItems } = usePagination(filteredTaxes, 10)

  const save = async () => {
    const val = parseFloat(form.value)
    if (!form.key || isNaN(val)) return

    try {
      if (modalMode === 'add') {
        await fetch(`${API}/tax`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ key: form.key, value: val }) })
      } else if (modalMode === 'edit' && editTarget) {
        await fetch(`${API}/tax/${editTarget.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ key: form.key, value: val }) })
      }
      closeModal()
      fetchTaxes()
    } catch { setError('Failed to save tax') }
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Taxes</h1>
          <p className="af-db-subtitle">Tax rates applied to leases and invoices</p>
        </div>
        <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none' }} onClick={openAdd}>
          + Add New
        </button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
          Show
          <select value={limit} onChange={e => setLimit(Number(e.target.value))} style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 7, color: 'var(--text)', fontSize: 11.5, padding: '5px 8px', fontFamily: 'inherit', cursor: 'pointer', maxWidth: 70 }}>
            {[10, 25, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          entries
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
          Search:
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tax name…"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '6px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', width: 200 }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading taxes…</div>
      ) : (
        <div className="af-prop-table-wrap">
          <table className="af-prop-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Value</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTaxes.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>No taxes found</td></tr>
              ) : pageItems.map((tx, i) => (
                <tr key={tx.id}>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{(page - 1) * pageSize + i + 1}</td>
                  <td style={{ fontWeight: 650 }}>{tx.key}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{Number(tx.value).toFixed(2)}</td>
                  <td>
                    <button
                      className="af-btn-secondary"
                      style={{ cursor: 'pointer', padding: '5px 12px', fontSize: 12 }}
                      onClick={() => openEdit(tx)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageSize={pageSize} totalItems={filteredTaxes.length} onPageChange={setPage} />
        </div>
      )}

      {modalMode !== null && (
        <div className="af-modal-overlay" onClick={closeModal}>
          <div className="af-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <h2 className="af-modal-title">{modalMode === 'add' ? 'Add Tax' : 'Edit Tax'}</h2>
            <div className="af-modal-form">
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
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={closeModal}>Close</button>
              <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save}>
                {modalMode === 'add' ? 'Save' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
