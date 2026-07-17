'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DatePicker from '@/components/DatePicker'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const PAYMENT_TYPES = ['Cash', 'Cheque', 'Pdc Cheque', 'Online']

function NewTransactionInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const leaseId = searchParams.get('leaseId') ?? ''
  const renter = searchParams.get('renter') ?? ''
  const property = searchParams.get('property') ?? ''

  const [form, setForm] = useState({ payment_month: '', amount: '', deposit_amount: '', payment_type: 'Cash', payment_date: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const backParams = new URLSearchParams({ leaseId, renter, property })

  const save = async () => {
    if (!form.amount || !form.payment_date) return
    setSaving(true); setError('')
    try {
      const res = await fetch(`${API}/payments/lease/${leaseId}/history`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          payment_month: form.payment_month,
          amount: parseFloat(form.amount) || 0,
          deposit_amount: parseFloat(form.deposit_amount) || 0,
          payment_type: form.payment_type,
          payment_date: form.payment_date,
        }),
      })
      if (!res.ok) throw new Error(`Save failed (${res.status})`)
      router.push(`/dashboard/payments/transactions?${backParams}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payment')
    } finally { setSaving(false) }
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Add Payment</h1>
          {(renter || property) && <p className="af-db-subtitle">{renter}{renter && property ? ' · ' : ''}{property}</p>}
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push(`/dashboard/payments/transactions?${backParams}`)}>← Back to Payment History</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 640 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="af-field">
            <label>Payment Month</label>
            <input value={form.payment_month} onChange={e => setForm(f => ({ ...f, payment_month: e.target.value }))} placeholder="e.g. January 2026" />
          </div>
          <div className="af-field">
            <label>Payment Type</label>
            <select className="af-select" value={form.payment_type} onChange={e => setForm(f => ({ ...f, payment_type: e.target.value }))}>
              {PAYMENT_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
            </select>
          </div>
          <div className="af-field">
            <label>Rent Amount</label>
            <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div className="af-field">
            <label>Deposit Amount</label>
            <input type="number" step="0.01" value={form.deposit_amount} onChange={e => setForm(f => ({ ...f, deposit_amount: e.target.value }))} />
          </div>
          <div className="af-field">
            <label>Payment Date</label>
            <DatePicker value={form.payment_date} onChange={v => setForm(f => ({ ...f, payment_date: v }))} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none' }} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Add Payment'}</button>
        </div>
      </div>
    </main>
  )
}

export default function NewTransactionPage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <NewTransactionInner />
    </Suspense>
  )
}
