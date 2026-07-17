'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const EMPTY_FORM = { renter_id: '', month: '', year: '', amount: '', status: '0' }

export default function PaymentForm() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const save = async () => {
    if (!form.renter_id || !form.month || !form.year || !form.amount) return
    setSaving(true); setError('')
    try {
      const res = await fetch(`${API}/payments`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          renter_id: parseInt(form.renter_id, 10), month: parseInt(form.month, 10),
          year: parseInt(form.year, 10), amount: parseFloat(form.amount), status: parseInt(form.status, 10),
        }),
      })
      if (!res.ok) throw new Error()
      router.push('/dashboard/payments')
    } catch { setError('Failed to save payment') }
    finally { setSaving(false) }
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>New Payment</h1>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/payments')}>← Back to Payments</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 620 }}>
        <div className="af-modal-form">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="af-field" style={{ gridColumn: '1 / -1' }}>
              <label>Renter ID</label>
              <input type="number" value={form.renter_id} onChange={e => setForm(f => ({ ...f, renter_id: e.target.value }))} placeholder="e.g. 1" />
            </div>
            <div className="af-field">
              <label>Month</label>
              <select className="af-select" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))}>
                <option value="">-- Select --</option>
                {MONTH_NAMES.slice(1).map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
              </select>
            </div>
            <div className="af-field"><label>Year</label><input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2026" /></div>
            <div className="af-field"><label>Amount</label><input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" /></div>
            <div className="af-field">
              <label>Status</label>
              <select className="af-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="0">Pending</option>
                <option value="1">Paid</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/payments')} disabled={saving}>Cancel</button>
          <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px', opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create payment'}</button>
        </div>
      </div>
    </main>
  )
}
