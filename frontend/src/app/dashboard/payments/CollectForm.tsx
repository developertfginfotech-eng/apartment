'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DatePicker from '@/components/DatePicker'
import FileDropInput from '@/components/FileDropInput'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

const PAYMENT_TYPES = ['Cash', 'Cheque', 'Pdc Cheque', 'Online']

interface CollectFormProps {
  kind: 'maintenance' | 'utility'
  id: number
  amount: string | number
  title: string
}

export default function CollectForm({ kind, id, amount, title }: CollectFormProps) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [collectForm, setCollectForm] = useState({
    payment_type: '', cheque_details: '', cheque_image: null as File | null,
    online_details: '', online_image: null as File | null,
    pdc_cheque_details: '', pdc_cheque_image: null as File | null, pdc_cheque_date: '',
    receipt_image: null as File | null,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const fmt = (v: string | number | null) => `₱ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

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
    if (!collectForm.payment_type) return
    setSaving(true); setError('')
    try {
      const body: Record<string, unknown> = { payment_type: collectForm.payment_type }
      if (collectForm.receipt_image) body.receipt_image = await uploadFile(collectForm.receipt_image)
      if (collectForm.payment_type === 'Cheque') {
        body.cheque_details = collectForm.cheque_details
        if (collectForm.cheque_image) body.cheque_image = await uploadFile(collectForm.cheque_image)
      } else if (collectForm.payment_type === 'Pdc Cheque') {
        body.pdc_cheque_details = collectForm.pdc_cheque_details
        body.pdc_cheque_date = collectForm.pdc_cheque_date
        if (collectForm.pdc_cheque_image) body.pdc_cheque_image = await uploadFile(collectForm.pdc_cheque_image)
      } else if (collectForm.payment_type === 'Online') {
        body.online_details = collectForm.online_details
        if (collectForm.online_image) body.online_image = await uploadFile(collectForm.online_image)
      }
      const res = await fetch(`${API}/payments/${kind}/${id}/pay`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      router.push('/dashboard/payments')
    } catch { setError('Failed to collect payment') }
    finally { setSaving(false) }
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>{kind === 'maintenance' ? 'Maintenance Collect' : 'Utility Collect'}</h1>
          {title && <p className="af-db-subtitle">{title}</p>}
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/payments')}>← Back to Payments</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 620 }}>
        <div className="af-modal-form">
          <div className="af-field" style={{ marginBottom: 4 }}>
            <label>Select Mode</label>
            <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
              {PAYMENT_TYPES.map(pt => (
                <label key={pt} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="radio" name="collect_payment_type" checked={collectForm.payment_type === pt} onChange={() => setCollectForm(f => ({ ...f, payment_type: pt }))} />
                  {pt}
                </label>
              ))}
            </div>
          </div>

          {collectForm.payment_type === 'Cheque' && (
            <div style={{ marginTop: 14, borderTop: '1px solid var(--border2)', paddingTop: 14 }}>
              <div className="af-field">
                <label>Cheque Details</label>
                <textarea rows={3} value={collectForm.cheque_details} onChange={e => setCollectForm(f => ({ ...f, cheque_details: e.target.value }))} />
              </div>
              <div className="af-field">
                <label>Cheque Image</label>
                <FileDropInput accept="image/*,.pdf" value={collectForm.cheque_image} onChange={file => setCollectForm(f => ({ ...f, cheque_image: file }))} />
              </div>
            </div>
          )}

          {collectForm.payment_type === 'Pdc Cheque' && (
            <div style={{ marginTop: 14, borderTop: '1px solid var(--border2)', paddingTop: 14 }}>
              <div className="af-field">
                <label>Pdc Cheque Details</label>
                <textarea rows={3} value={collectForm.pdc_cheque_details} onChange={e => setCollectForm(f => ({ ...f, pdc_cheque_details: e.target.value }))} />
              </div>
              <div className="af-field">
                <label>Pdc Cheque Image</label>
                <FileDropInput accept="image/*,.pdf" value={collectForm.pdc_cheque_image} onChange={file => setCollectForm(f => ({ ...f, pdc_cheque_image: file }))} />
              </div>
              <div className="af-field">
                <label>Pdc Cheque Date</label>
                <DatePicker value={collectForm.pdc_cheque_date} onChange={v => setCollectForm(f => ({ ...f, pdc_cheque_date: v }))} />
              </div>
            </div>
          )}

          {collectForm.payment_type === 'Online' && (
            <div style={{ marginTop: 14, borderTop: '1px solid var(--border2)', paddingTop: 14 }}>
              <div className="af-field">
                <label>Online Details</label>
                <textarea rows={3} value={collectForm.online_details} onChange={e => setCollectForm(f => ({ ...f, online_details: e.target.value }))} />
              </div>
              <div className="af-field">
                <label>Online Image</label>
                <FileDropInput accept="image/*,.pdf" value={collectForm.online_image} onChange={file => setCollectForm(f => ({ ...f, online_image: file }))} />
              </div>
            </div>
          )}

          <div style={{ marginTop: 14, borderTop: '1px solid var(--border2)', paddingTop: 14 }}>
            <div className="af-field">
              <label>{kind === 'maintenance' ? 'Total Maintenance' : 'Total Bill'}</label>
              <input value={fmt(amount)} readOnly disabled />
            </div>
            <div className="af-field">
              <label>Receipt Image</label>
              <FileDropInput accept="image/*,.pdf" value={collectForm.receipt_image} onChange={file => setCollectForm(f => ({ ...f, receipt_image: file }))} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/payments')} disabled={saving}>Cancel</button>
          <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px', opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving || !collectForm.payment_type}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </main>
  )
}
