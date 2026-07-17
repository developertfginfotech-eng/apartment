'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DatePicker from '@/components/DatePicker'
import FileDropInput from '@/components/FileDropInput'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

const PAYMENT_TYPES = ['Cash', 'Cheque', 'Pdc Cheque', 'Online']

const EMPTY_FORM = { title: '', amount: '', type: 'add' as 'add' | 'deduct', payment_date: '', payment_type: 'Cash', reason: '', receiptFile: null as File | null }

interface SecurityMoneyFormProps {
  leaseId: number
  renterName?: string
  propertyName?: string
  rentDeposit?: string
}

export default function SecurityMoneyForm({ leaseId, renterName, propertyName, rentDeposit }: SecurityMoneyFormProps) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const fmt = (v: string | number | null | undefined) => `₱ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const uploadReceipt = async (file: File): Promise<string | null> => {
    const body = new FormData()
    body.append('file', file)
    const res = await fetch(`${API}/document/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('apt_token')}` },
      body,
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.url ?? null
  }

  const save = async () => {
    if (!leaseId || !form.title || !form.amount || !form.payment_date) return
    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0) return

    setSaving(true); setError('')
    try {
      let receiptUrl: string | null = null
      if (form.receiptFile) receiptUrl = await uploadReceipt(form.receiptFile)

      const res = await fetch(`${API}/security-money/${leaseId}/history`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: form.title, amount: amt, type: form.type,
          payment_date: form.payment_date, payment_type: form.payment_type, reason: form.reason || null,
          receipt_image: receiptUrl,
        }),
      })
      if (!res.ok) throw new Error()
      router.push('/dashboard/security-money')
    } catch { setError('Failed to save transaction') }
    finally { setSaving(false) }
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Add Security Money Transaction</h1>
          {(renterName || propertyName) && (
            <p className="af-db-subtitle">
              {renterName}{propertyName ? ` · ${propertyName}` : ''}
              {rentDeposit ? <> · Current deposit: <strong style={{ color: '#22c55e' }}>{fmt(rentDeposit)}</strong></> : null}
            </p>
          )}
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/security-money')}>← Back to Security Money</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 720 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="af-field" style={{ gridColumn: 'span 2' }}>
            <label>Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Security Deposit Refund" />
          </div>
          <div className="af-field">
            <label>Type</label>
            <select className="af-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'add' | 'deduct' }))}>
              <option value="add">Add</option>
              <option value="deduct">Deduct</option>
            </select>
          </div>
          <div className="af-field">
            <label>Amount</label>
            <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
          </div>
          <div className="af-field">
            <label>Payment Date</label>
            <DatePicker value={form.payment_date} onChange={v => setForm(f => ({ ...f, payment_date: v }))} />
          </div>
          <div className="af-field">
            <label>Payment Type</label>
            <select className="af-select" value={form.payment_type} onChange={e => setForm(f => ({ ...f, payment_type: e.target.value }))}>
              {PAYMENT_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
            </select>
          </div>
          <div className="af-field" style={{ gridColumn: 'span 2' }}>
            <label>Reason (optional)</label>
            <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. Damage repair" />
          </div>
          <div className="af-field" style={{ gridColumn: 'span 2' }}>
            <label>Receipt Image</label>
            <FileDropInput accept="image/*,.pdf" value={form.receiptFile} onChange={file => setForm(f => ({ ...f, receiptFile: file }))} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/security-money')} disabled={saving}>Cancel</button>
          <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </main>
  )
}
