'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import DatePicker from '@/components/DatePicker'
import FileDropInput from '@/components/FileDropInput'
import Pagination, { usePagination } from '@/components/Pagination'
import { formatDate } from '@/lib/date'

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
  latest_payment_date: string | null
  latest_payment_amount: string | number | null
  available_balance: number | null
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

export default function LoanPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [loans, setLoans] = useState<Loan[]>([])
  const [employees, setEmployees] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Loan | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [viewing, setViewing] = useState<Loan | null>(null)
  const [uploading, setUploading] = useState(false)

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const fetchLoans = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/loan`, { headers: authHeaders() })
      const data = await res.json()
      setLoans(Array.isArray(data) ? data : [])
    } catch { setError('Failed to load loans') }
    finally { setLoading(false) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchLoans() }, [fetchLoans])

  useEffect(() => {
    fetch(`${API}/payroll/employees`, { headers: authHeaders() })
      .then(r => r.json()).then(d => Array.isArray(d) && setEmployees(d)).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (v: string | number | null) => `₱ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const filteredLoans = loans.filter(l =>
    !search || l.employee_name?.toLowerCase().includes(search.toLowerCase()) || String(l.amount_of_loan).includes(search)
  )
  const { page, setPage, pageSize, pageItems } = usePagination(filteredLoans, 10)

  const totalLoans = loans.reduce((s, l) => s + Number(l.amount_of_loan), 0)
  const outstanding = loans.filter(l => l.payment_status !== 'paid').reduce((s, l) => s + Number(l.amount_of_loan), 0)
  const paidAmount = loans.filter(l => l.payment_status === 'paid').reduce((s, l) => s + Number(l.amount_of_loan), 0)

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (l: Loan) => {
    setEditing(l)
    setForm({
      employee_id: String(l.employee_id), amount_of_loan: String(l.amount_of_loan),
      loan_from_company: l.loan_from_company, name_of_bank: l.name_of_bank ?? '',
      interest_of_bank: l.interest_of_bank ? String(l.interest_of_bank) : '',
      date_of_the_loan: l.date_of_the_loan?.slice(0, 10) ?? '', payment_date: l.payment_date?.slice(0, 10) ?? '',
      payment_type: l.payment_type ?? 'Cash', payment_status: l.payment_status ?? 'pending', status: l.status,
      receiptFile: null,
    })
    setShowModal(true)
  }

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
    if (!form.employee_id || !form.amount_of_loan || !form.loan_from_company || !form.date_of_the_loan || !form.payment_date) return
    setUploading(true)
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

      if (editing) {
        await fetch(`${API}/loan/${editing.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) })
      } else {
        await fetch(`${API}/loan`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) })
      }
      setShowModal(false)
      fetchLoans()
    } catch { setError('Failed to save loan') }
    finally { setUploading(false) }
  }

  const del = async (id: number) => {
    try {
      await fetch(`${API}/loan/${id}`, { method: 'DELETE', headers: authHeaders() })
      fetchLoans()
    } catch { setError('Failed to delete loan') }
  }

  const toggleStatus = async (l: Loan) => {
    try {
      await fetch(`${API}/loan/${l.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status: l.status === 1 ? 0 : 1 }) })
      fetchLoans()
    } catch { setError('Failed to update status') }
  }

  const exportHeaders = ['#', 'Employee', 'Amount of Loan', 'Loan From', 'Date of Loan', 'Payment Date', 'Payment Amount', 'Available Balance', 'Status']
  const exportRows = () => filteredLoans.map((l, i) => [
    i + 1, l.employee_name || '-', fmt(l.amount_of_loan), l.loan_from_company,
    formatDate(l.date_of_the_loan), l.latest_payment_date ? formatDate(l.latest_payment_date) : '-', l.latest_payment_amount ? fmt(l.latest_payment_amount) : '-',
    l.available_balance !== null ? fmt(l.available_balance) : '-', l.status === 1 ? 'Active' : 'Inactive',
  ])

  const exportCSV = () => {
    const csv = [exportHeaders, ...exportRows()].map(r => r.join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'loans.csv' })
    a.click()
  }

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Loan List', 14, 14)
    autoTable(doc, {
      head: [exportHeaders],
      body: exportRows().map(r => r.map(String)),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    })
    doc.save('loans.pdf')
  }

  const sf = <K extends keyof typeof EMPTY_FORM>(k: K, v: typeof EMPTY_FORM[K]) => setForm(f => ({ ...f, [k]: v }))

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Loans</h1>
          <p className="af-db-subtitle">Employee loan tracking &amp; repayment</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Export To Excel
          </button>
          <button onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Export To Pdf
          </button>
          <button className="af-btn-primary" onClick={openNew} style={{ cursor: 'pointer', border: 'none' }}>+ Add Loan</button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total Loans', value: fmt(totalLoans), sub: `${loans.length} records`, color: 'var(--accent)' },
          { label: 'Outstanding', value: fmt(outstanding), sub: `${loans.filter(l => l.payment_status !== 'paid').length} unpaid`, color: '#ef4444' },
          { label: 'Paid', value: fmt(paidAmount), sub: `${loans.filter(l => l.payment_status === 'paid').length} cleared`, color: '#22c55e' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: '20px 22px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 820, letterSpacing: '-0.03em', color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
          Search:
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Employee, amount…"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '6px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', width: 200 }} />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading loans…</div>
      ) : (
        <div className="af-prop-table-wrap" style={{ overflowX: 'auto' }}>
          <table className="af-prop-table" style={{ minWidth: 1100 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Employee Name</th>
                <th>Amount of Loan</th>
                <th>Loan From Company</th>
                <th>Date of the Loan</th>
                <th>Payment Date</th>
                <th>Payment Amount</th>
                <th>Available Balance</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoans.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No loans found</td></tr>
              ) : pageItems.map((l, i) => (
                <tr key={l.id} style={{ opacity: l.status === 0 ? 0.6 : 1 }}>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{(page - 1) * pageSize + i + 1}</td>
                  <td style={{ fontWeight: 650 }}>{l.employee_name || '—'}</td>
                  <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(l.amount_of_loan)}</td>
                  <td>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100, background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                      {l.loan_from_company}
                    </span>
                    {l.loan_from_company === 'BANK' && l.name_of_bank && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{l.name_of_bank}{l.interest_of_bank ? ` · ${l.interest_of_bank}%` : ''}</div>
                    )}
                  </td>
                  <td style={{ fontSize: 13 }}>{formatDate(l.date_of_the_loan)}</td>
                  <td style={{ fontSize: 13 }}>{formatDate(l.latest_payment_date)}</td>
                  <td style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{l.latest_payment_amount ? fmt(l.latest_payment_amount) : '—'}</td>
                  <td style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{l.available_balance !== null ? fmt(l.available_balance) : '—'}</td>
                  <td>
                    <span
                      onClick={() => toggleStatus(l)}
                      style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100, cursor: 'pointer', userSelect: 'none', background: l.status === 1 ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)', color: l.status === 1 ? '#22c55e' : '#64748b' }}
                      title="Click to toggle"
                    >
                      {l.status === 1 ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="af-prop-act edit" onClick={() => setViewing(l)}>View</button>
                      <button className="af-prop-act edit" onClick={() => openEdit(l)}>Edit</button>
                      <button className="af-prop-act del" onClick={() => del(l.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageSize={pageSize} totalItems={filteredLoans.length} onPageChange={setPage} />
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="af-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="af-modal" style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">{editing ? 'Edit Loan' : 'Add Loan'}</h2>
            <div className="af-modal-form">
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
                  {editing?.receipt_image && !form.receiptFile && (
                    <a href={`${API}${editing.receipt_image}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)', marginTop: 6, display: 'inline-block' }}>View current receipt</a>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setShowModal(false)} disabled={uploading}>Cancel</button>
              <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px', opacity: uploading ? 0.7 : 1 }} onClick={save} disabled={uploading}>
                {uploading ? 'Saving…' : editing ? 'Save changes' : 'Add loan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewing && (
        <div className="af-modal-overlay" onClick={() => setViewing(null)}>
          <div className="af-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">Loan Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {([
                ['Employee', viewing.employee_name || '—'],
                ['Amount of Loan', fmt(viewing.amount_of_loan)],
                ['Loan From Company', viewing.loan_from_company],
                ['Date of the Loan', formatDate(viewing.date_of_the_loan)],
                ['Payment Date', formatDate(viewing.payment_date)],
                ['Payment Type', viewing.payment_type || '—'],
                ['Payment Status', viewing.payment_status],
                ['Status', viewing.status === 1 ? 'Active' : 'Inactive'],
                ...(viewing.loan_from_company === 'BANK' ? [['Name of Bank', viewing.name_of_bank || '—'], ['Interest of Bank', viewing.interest_of_bank ? `${viewing.interest_of_bank}%` : '—']] : []),
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>
            {viewing.receipt_image && (
              <a href={`${API}${viewing.receipt_image}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--accent)' }}>View Receipt Image</a>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
