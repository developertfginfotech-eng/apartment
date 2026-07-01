'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Payment {
  id: number
  renter_id: number
  month: number
  year: number
  amount: number
  status: number
}

const STATUS_STYLE: Record<number, { bg: string; color: string; label: string }> = {
  1: { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', label: 'Paid' },
  0: { bg: 'rgba(249,115,22,0.12)', color: '#f97316', label: 'Pending' },
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const EMPTY_FORM = {
  renter_id: '',
  month: '',
  year: '',
  amount: '',
  status: '0',
}

export default function PaymentsPage() {
  const router = useRouter()

  const [payments, setPayments]   = useState<Payment[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState<Payment | null>(null)
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

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('http://localhost:3000/payments', { headers: authHeaders() })
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      const data = await res.json()
      setPayments(Array.isArray(data) ? data : data.data ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchPayments() }, [fetchPayments])

  const collected = payments.filter(p => p.status === 1).reduce((s, p) => s + Number(p.amount), 0)
  const pending   = payments.filter(p => p.status === 0).reduce((s, p) => s + Number(p.amount), 0)

  const openCreate = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (p: Payment) => {
    setEditTarget(p)
    setForm({
      renter_id: String(p.renter_id),
      month: String(p.month),
      year: String(p.year),
      amount: String(p.amount),
      status: String(p.status),
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditTarget(null)
    setForm(EMPTY_FORM)
  }

  const savePayment = async () => {
    if (!form.renter_id || !form.month || !form.year || !form.amount) return
    setSaving(true)
    setError('')
    try {
      const body = {
        renter_id: parseInt(form.renter_id, 10),
        month: parseInt(form.month, 10),
        year: parseInt(form.year, 10),
        amount: parseFloat(form.amount),
        status: parseInt(form.status, 10),
      }

      const url = editTarget
        ? `http://localhost:3000/payments/${editTarget.id}`
        : 'http://localhost:3000/payments'
      const method = editTarget ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      closeForm()
      await fetchPayments()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save payment')
    } finally {
      setSaving(false)
    }
  }

  const deletePayment = async (id: number) => {
    if (!confirm('Delete this payment?')) return
    setError('')
    try {
      const res = await fetch(`http://localhost:3000/payments/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
      await fetchPayments()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete payment')
    }
  }

  const markPaid = async (p: Payment) => {
    setError('')
    try {
      const res = await fetch(`http://localhost:3000/payments/${p.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ ...p, status: 1 }),
      })
      if (!res.ok) throw new Error(`Update failed: ${res.status}`)
      await fetchPayments()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update payment')
    }
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Payments</h1>
          <p className="af-db-subtitle">Rent collection</p>
        </div>
        <button className="af-btn-primary" onClick={openCreate} style={{ cursor: 'pointer', border: 'none' }}>
          + New Payment
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Collected', value: collected, color: '#22c55e' },
          { label: 'Pending',   value: pending,   color: '#f97316' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 820, letterSpacing: '-0.03em', color: s.color, fontVariantNumeric: 'tabular-nums' }}>
              ${s.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 18, color: '#ef4444', fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
          Loading payments…
        </div>
      ) : payments.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
          No payments found.
        </div>
      ) : (
        <div className="af-prop-table-wrap">
          <table className="af-prop-table">
            <thead>
              <tr>
                <th>Renter ID</th>
                <th>Month</th>
                <th>Year</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => {
                const st = STATUS_STYLE[p.status] ?? STATUS_STYLE[0]
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 650 }}>{p.renter_id}</td>
                    <td style={{ fontSize: 13 }}>{MONTH_NAMES[p.month] ?? p.month}</td>
                    <td style={{ fontSize: 13 }}>{p.year}</td>
                    <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      ${Number(p.amount).toLocaleString()}
                    </td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100, background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      {p.status === 0 && (
                        <button className="af-prop-act edit" onClick={() => markPaid(p)}>Mark Paid</button>
                      )}
                      <button className="af-prop-act edit" onClick={() => openEdit(p)}>Edit</button>
                      <button className="af-prop-act delete" onClick={() => deletePayment(p.id)}>Delete</button>
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
            <h2 className="af-modal-title">{editTarget ? 'Edit Payment' : 'New Payment'}</h2>
            <div className="af-modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="af-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Renter ID</label>
                  <input
                    type="number"
                    value={form.renter_id}
                    onChange={e => setForm(f => ({ ...f, renter_id: e.target.value }))}
                    placeholder="e.g. 1"
                  />
                </div>
                <div className="af-field">
                  <label>Month (1–12)</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={form.month}
                    onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                    placeholder="6"
                  />
                </div>
                <div className="af-field">
                  <label>Year</label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                    placeholder="2026"
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
                  <label>Status</label>
                  <select className="af-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="0">Pending</option>
                    <option value="1">Paid</option>
                  </select>
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
                onClick={savePayment}
                disabled={saving}
              >
                {saving ? 'Saving…' : editTarget ? 'Save changes' : 'Create payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
