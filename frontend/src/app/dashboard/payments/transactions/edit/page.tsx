'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DatePicker from '@/components/DatePicker'
import FileDropInput from '@/components/FileDropInput'
import { toDateInputValue } from '@/lib/date'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const PAYMENT_TYPES = ['Cash', 'Cheque', 'Pdc Cheque', 'Online']

interface HistoryRow {
  id: number
  lease_id: number | null
  amount: string | number
  payment_date: string | null
  payment_type: string | null
  deposit_amount: string | number | null
  remark: string | null
  receipt_image: string | null
  cheque_details: string | null
  online_details: string | null
  pdc_cheque_details: string | null
  pdc_cheque_date: string | null
}

function EditTransactionInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id') ?? ''
  const leaseId = searchParams.get('leaseId') ?? ''
  const renter = searchParams.get('renter') ?? ''
  const property = searchParams.get('property') ?? ''

  const [row, setRow] = useState<HistoryRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    amount: '', payment_date: '', payment_type: 'Cash', deposit_amount: '', remark: '',
    cheque_details: '', cheque_image: null as File | null,
    online_details: '', online_image: null as File | null,
    pdc_cheque_details: '', pdc_cheque_image: null as File | null, pdc_cheque_date: '',
    receipt_image: null as File | null,
  })

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const backParams = new URLSearchParams({ leaseId, renter, property })

  useEffect(() => {
    if (!id) return
    fetch(`${API}/payments/history/${id}`, { headers: authHeaders() })
      .then(res => res.json())
      .then((h: HistoryRow) => {
        setRow(h)
        setForm({
          amount: String(h.amount ?? ''), payment_date: toDateInputValue(h.payment_date),
          payment_type: h.payment_type ?? 'Cash', deposit_amount: h.deposit_amount != null ? String(h.deposit_amount) : '',
          remark: h.remark ?? '',
          cheque_details: h.cheque_details ?? '', cheque_image: null,
          online_details: h.online_details ?? '', online_image: null,
          pdc_cheque_details: h.pdc_cheque_details ?? '', pdc_cheque_image: null, pdc_cheque_date: toDateInputValue(h.pdc_cheque_date),
          receipt_image: null,
        })
      })
      .catch(() => setError('Failed to load payment'))
      .finally(() => setLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const uploadFile = async (file: File): Promise<string | null> => {
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
    setError('')
    try {
      const body: Record<string, unknown> = {
        amount: parseFloat(form.amount) || 0,
        payment_date: form.payment_date,
        payment_type: form.payment_type,
        deposit_amount: parseFloat(form.deposit_amount) || 0,
        remark: form.remark,
      }
      if (form.receipt_image) body.receipt_image = await uploadFile(form.receipt_image)
      if (form.payment_type === 'Cheque') {
        body.cheque_details = form.cheque_details
        if (form.cheque_image) body.cheque_image = await uploadFile(form.cheque_image)
      } else if (form.payment_type === 'Pdc Cheque') {
        body.pdc_cheque_details = form.pdc_cheque_details
        body.pdc_cheque_date = form.pdc_cheque_date
        if (form.pdc_cheque_image) body.pdc_cheque_image = await uploadFile(form.pdc_cheque_image)
      } else if (form.payment_type === 'Online') {
        body.online_details = form.online_details
        if (form.online_image) body.online_image = await uploadFile(form.online_image)
      }
      await fetch(`${API}/payments/history/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) })
      router.push(`/dashboard/payments/transactions?${backParams}`)
    } catch { setError('Failed to save transaction') }
  }

  if (loading) return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  if (!row) return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Payment not found</div></main>

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Edit Payment History</h1>
          {(renter || property) && <p className="af-db-subtitle">{renter}{renter && property ? ' · ' : ''}{property}</p>}
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push(`/dashboard/payments/transactions?${backParams}`)}>← Back to Payment History</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 700 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

        <div className="af-field" style={{ marginTop: 4 }}>
          <label>Select Mode</label>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
            {PAYMENT_TYPES.map(pt => (
              <label key={pt} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="radio" name="history_payment_type" checked={form.payment_type === pt} onChange={() => setForm(f => ({ ...f, payment_type: pt }))} />
                {pt}
              </label>
            ))}
          </div>
        </div>

        {form.payment_type === 'Cheque' && (
          <div style={{ marginTop: 10, borderTop: '1px solid var(--border2)', paddingTop: 14 }}>
            <div className="af-field">
              <label>Cheque Details</label>
              <textarea rows={3} value={form.cheque_details} onChange={e => setForm(f => ({ ...f, cheque_details: e.target.value }))} />
            </div>
            <div className="af-field">
              <label>Cheque Image</label>
              <FileDropInput accept="image/*,.pdf" value={form.cheque_image} onChange={file => setForm(f => ({ ...f, cheque_image: file }))} />
            </div>
          </div>
        )}

        {form.payment_type === 'Pdc Cheque' && (
          <div style={{ marginTop: 10, borderTop: '1px solid var(--border2)', paddingTop: 14 }}>
            <div className="af-field">
              <label>Pdc Cheque Details</label>
              <textarea rows={3} value={form.pdc_cheque_details} onChange={e => setForm(f => ({ ...f, pdc_cheque_details: e.target.value }))} />
            </div>
            <div className="af-field">
              <label>Pdc Cheque Image</label>
              <FileDropInput accept="image/*,.pdf" value={form.pdc_cheque_image} onChange={file => setForm(f => ({ ...f, pdc_cheque_image: file }))} />
            </div>
            <div className="af-field">
              <label>Pdc Cheque Date</label>
              <DatePicker value={form.pdc_cheque_date} onChange={v => setForm(f => ({ ...f, pdc_cheque_date: v }))} />
            </div>
          </div>
        )}

        {form.payment_type === 'Online' && (
          <div style={{ marginTop: 10, borderTop: '1px solid var(--border2)', paddingTop: 14 }}>
            <div className="af-field">
              <label>Online Details</label>
              <textarea rows={3} value={form.online_details} onChange={e => setForm(f => ({ ...f, online_details: e.target.value }))} />
            </div>
            <div className="af-field">
              <label>Online Image</label>
              <FileDropInput accept="image/*,.pdf" value={form.online_image} onChange={file => setForm(f => ({ ...f, online_image: file }))} />
            </div>
          </div>
        )}

        <div style={{ marginTop: 10, borderTop: '1px solid var(--border2)', paddingTop: 14 }}>
          <div className="af-field">
            <label>Receipt Image</label>
            <FileDropInput accept="image/*,.pdf" value={form.receipt_image} onChange={file => setForm(f => ({ ...f, receipt_image: file }))} />
            {row.receipt_image && !form.receipt_image && (
              <a href={`${API}${row.receipt_image}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)', marginTop: 6, display: 'inline-block' }}>View current receipt</a>
            )}
          </div>
          <div className="af-field">
            <label>Remark</label>
            <textarea rows={2} value={form.remark} onChange={e => setForm(f => ({ ...f, remark: e.target.value }))} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none' }} onClick={save}>Save Changes</button>
        </div>
      </div>
    </main>
  )
}

export default function EditTransactionPage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <EditTransactionInner />
    </Suspense>
  )
}
