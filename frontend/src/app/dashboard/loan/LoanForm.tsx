'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DatePicker from '@/components/DatePicker'
import FileDropInput from '@/components/FileDropInput'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Loan {
  id: number
  employee_id: number
  employee_name: string
  amount_of_loan: string | number
  loan_from_company: 'EPERC' | 'PHIC' | 'SSS' | 'HDMF' | 'BANK'
  date_of_the_loan: string
  name_of_bank: string | null
  interest_of_bank: string | number | null
  status: number
  payment_date: string
  payment_status: 'pending' | 'paid'
  payment_type: string
  receipt_image: string | null
}

const LOAN_FROM_OPTIONS: { value: Loan['loan_from_company']; label: string }[] = [
  { value: 'EPERC', label: 'Loan From EPERC' },
  { value: 'PHIC', label: 'Loan From PHIC' },
  { value: 'SSS', label: 'Loan From SSS' },
  { value: 'HDMF', label: 'Loan From HDMF' },
  { value: 'BANK', label: 'Loan From Bank' },
]

const PAYMENT_TYPES = ['Cash', 'Cheque', 'Pdc Cheque', 'Online']

const EMPTY_FORM = {
  employee_id: '', amount_of_loan: '', loan_from_company: '' as Loan['loan_from_company'] | '',
  name_of_bank: '', interest_of_bank: '', date_of_the_loan: '', payment_date: '',
  payment_type: 'Cash', payment_status: 'pending' as 'pending' | 'paid', status: 1,
  receiptFile: null as File | null,
}

export default function LoanForm({ loanId }: { loanId?: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [employees, setEmployees] = useState<{ id: number; name: string }[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [existingReceipt, setExistingReceipt] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!loanId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  useEffect(() => {
    fetch(`${API}/payroll/employees`, { headers: authHeaders() })
      .then(r => r.json()).then(d => Array.isArray(d) && setEmployees(d)).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loanId) return
    (async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/loan`, { headers: authHeaders() })
        const data = await res.json()
        const l = Array.isArray(data) ? data.find((x: Loan) => x.id === loanId) : null
        if (!l) throw new Error()
        setForm({
          employee_id: String(l.employee_id), amount_of_loan: String(l.amount_of_loan),
          loan_from_company: l.loan_from_company, name_of_bank: l.name_of_bank ?? '',
          interest_of_bank: l.interest_of_bank ? String(l.interest_of_bank) : '',
          date_of_the_loan: l.date_of_the_loan?.slice(0, 10) ?? '', payment_date: l.payment_date?.slice(0, 10) ?? '',
          payment_type: l.payment_type ?? 'Cash', payment_status: l.payment_status ?? 'pending', status: l.status,
          receiptFile: null,
        })
        setExistingReceipt(l.receipt_image ?? null)
      } catch { setError('Failed to load loan') }
      finally { setLoading(false) }
    })()
  }, [loanId]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const sf = <K extends keyof typeof EMPTY_FORM>(k: K, v: typeof EMPTY_FORM[K]) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.employee_id || !form.amount_of_loan || !form.loan_from_company || !form.date_of_the_loan || !form.payment_date) return
    setSaving(true); setError('')
    try {
      let receiptUrl: string | null | undefined
      if (form.receiptFile) receiptUrl = await uploadReceipt(form.receiptFile)

      const body: Record<string, unknown> = {
        employee_id: parseInt(form.employee_id, 10),
        amount_of_loan: parseFloat(form.amount_of_loan) || 0,
        loan_from_company: form.loan_from_company,
        name_of_bank: form.loan_from_company === 'BANK' ? form.name_of_bank : null,
        interest_of_bank: form.loan_from_company === 'BANK' ? (parseFloat(form.interest_of_bank) || 0) : null,
        date_of_the_loan: form.date_of_the_loan,
        payment_date: form.payment_date,
        payment_type: form.payment_type,
        payment_status: form.payment_status,
        status: form.status,
      }
      if (receiptUrl) body.receipt_image = receiptUrl

      const url = loanId ? `${API}/loan/${loanId}` : `${API}/loan`
      const method = loanId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      router.push('/dashboard/loan')
    } catch { setError(loanId ? 'Failed to update loan' : 'Failed to create loan') }
    finally { setSaving(false) }
  }

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>{loanId ? 'Edit Loan' : 'Add Loan'}</h1>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/loan')}>← Back to Loans</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 720 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="af-field" style={{ gridColumn: '1/-1' }}>
            <label>Employee Name</label>
            <select className="af-select" value={form.employee_id} onChange={e => sf('employee_id', e.target.value)}>
              <option value="">-- Select Employee --</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="af-field">
            <label>Amount of Loan</label>
            <input type="number" min="0" step="0.01" value={form.amount_of_loan} onChange={e => sf('amount_of_loan', e.target.value)} placeholder="5000"/>
          </div>
          <div className="af-field">
            <label>Loan From Company</label>
            <select className="af-select" value={form.loan_from_company} onChange={e => sf('loan_from_company', e.target.value as Loan['loan_from_company'])}>
              <option value="">Select Loan From Company</option>
              {LOAN_FROM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {form.loan_from_company === 'BANK' && (
            <>
              <div className="af-field">
                <label>Name of Bank</label>
                <input value={form.name_of_bank} onChange={e => sf('name_of_bank', e.target.value)} placeholder="BDO Bank"/>
              </div>
              <div className="af-field">
                <label>Interest of Bank (%)</label>
                <input type="number" min="0" step="0.01" value={form.interest_of_bank} onChange={e => sf('interest_of_bank', e.target.value)} placeholder="6.5"/>
              </div>
            </>
          )}

          <div className="af-field">
            <label>Date of the Loan</label>
            <DatePicker value={form.date_of_the_loan} onChange={v => sf('date_of_the_loan', v)}/>
          </div>
          <div className="af-field">
            <label>Payment Date</label>
            <DatePicker value={form.payment_date} onChange={v => sf('payment_date', v)}/>
          </div>
          <div className="af-field">
            <label>Payment Status</label>
            <select className="af-select" value={form.payment_status} onChange={e => sf('payment_status', e.target.value as 'pending' | 'paid')}>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div className="af-field">
            <label>Loan Status</label>
            <select className="af-select" value={form.status} onChange={e => sf('status', Number(e.target.value))}>
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </select>
          </div>
          <div className="af-field" style={{ gridColumn: '1/-1' }}>
            <label>Select Mode</label>
            <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
              {PAYMENT_TYPES.map(pt => (
                <label key={pt} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="radio" name="payment_type" checked={form.payment_type === pt} onChange={() => sf('payment_type', pt)} />
                  {pt}
                </label>
              ))}
            </div>
          </div>
          <div className="af-field" style={{ gridColumn: '1/-1' }}>
            <label>Receipt Image</label>
            <FileDropInput accept="image/*,.pdf" value={form.receiptFile} onChange={file => sf('receiptFile', file)} />
            {existingReceipt && !form.receiptFile && (
              <a href={`${API}${existingReceipt}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)', marginTop: 6, display: 'inline-block' }}>View current receipt</a>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/loan')} disabled={saving}>Cancel</button>
          <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : loanId ? 'Save changes' : 'Add loan'}
          </button>
        </div>
      </div>
    </main>
  )
}
