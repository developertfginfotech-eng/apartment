'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface TaxRate {
  id: string
  key: string
  value: number
  status: 'active' | 'inactive'
}

const SEED: TaxRate[] = [
  { id: 'tx1', key: 'Standard WHT',     value:  5.0, status: 'active' },
  { id: 'tx2', key: 'Professional Fee', value: 10.0, status: 'active' },
  { id: 'tx3', key: 'Rental Income',    value:  5.0, status: 'active' },
  { id: 'tx4', key: 'Corporate WHT',    value: 20.0, status: 'inactive' },
  { id: 'tx5', key: 'VAT',              value: 12.0, status: 'active' },
]

type ModalMode = 'add' | 'edit' | null

export default function TaxesPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [taxes, setTaxes] = useState<TaxRate[]>(SEED)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editTarget, setEditTarget] = useState<TaxRate | null>(null)
  const [form, setForm] = useState({ key: '', value: '', status: 'active' as 'active' | 'inactive' })

  const openAdd = () => {
    setEditTarget(null)
    setForm({ key: '', value: '', status: 'active' })
    setModalMode('add')
  }

  const openEdit = (tax: TaxRate) => {
    setEditTarget(tax)
    setForm({ key: tax.key, value: String(tax.value), status: tax.status })
    setModalMode('edit')
  }

  const closeModal = () => { setModalMode(null); setEditTarget(null) }

  const save = () => {
    const val = parseFloat(form.value)
    if (!form.key || isNaN(val)) return

    if (modalMode === 'add') {
      setTaxes(ts => [...ts, { id: `tx${Date.now()}`, key: form.key, value: val, status: form.status }])
    } else if (modalMode === 'edit' && editTarget) {
      setTaxes(ts => ts.map(t => t.id === editTarget.id ? { ...t, key: form.key, value: val, status: form.status } : t))
    }
    closeModal()
  }

  const deleteTax = (id: string) => { setTaxes(ts => ts.filter(t => t.id !== id)) }

  const toggleStatus = (id: string) => {
    setTaxes(ts => ts.map(t => t.id === id ? { ...t, status: t.status === 'active' ? 'inactive' : 'active' } : t))
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
            {taxes.map(tx => (
              <tr key={tx.id}>
                <td style={{ fontWeight: 650 }}>{tx.key}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{tx.value.toFixed(1)}%</td>
                <td>
                  <button
                    onClick={() => toggleStatus(tx.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 100,
                      cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                      background: tx.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)',
                      color: tx.status === 'active' ? '#22c55e' : '#64748b',
                    }}
                    title="Click to toggle"
                  >
                    <span style={{
                      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                      background: tx.status === 'active' ? '#22c55e' : '#64748b',
                    }} />
                    {tx.status === 'active' ? 'Active' : 'Inactive'}
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
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
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
