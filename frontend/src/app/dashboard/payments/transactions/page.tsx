'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import DatePicker from '@/components/DatePicker'
import Pagination, { usePagination } from '@/components/Pagination'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface HistoryRow {
  id: number
  renter_name: string | null
  month: string | null
  payment_month: string | null
  amount: string | number
  deposit_amount: string | number | null
  payment_type: string | null
  payment_date: string | null
}

const PAYMENT_TYPES = ['Cash', 'Cheque', 'Pdc Cheque', 'Online']

function PaymentTransactionsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const leaseId = searchParams.get('leaseId') ?? ''
  const renterLabel = searchParams.get('renter') ?? ''
  const propertyLabel = searchParams.get('property') ?? ''

  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [history, setHistory] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [newForm, setNewForm] = useState({ payment_month: '', amount: '', deposit_amount: '', payment_type: 'Cash', payment_date: '' })
  const [saving, setSaving] = useState(false)

  const [editingHistory, setEditingHistory] = useState<HistoryRow | null>(null)
  const [historyForm, setHistoryForm] = useState({ amount: '', payment_date: '', payment_type: 'Cash', deposit_amount: '' })

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const fmt = (v: string | number | null) => `₱ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const fetchHistory = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/payments/lease/${leaseId}/history`, { headers: authHeaders() })
      if (!res.ok) throw new Error(`Failed to load (${res.status})`)
      setHistory(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment history')
    } finally { setLoading(false) }
  }, [leaseId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const filtered = history.filter(h => {
    if (dateFrom && (!h.payment_date || h.payment_date.slice(0, 10) < dateFrom)) return false
    if (dateTo && (!h.payment_date || h.payment_date.slice(0, 10) > dateTo)) return false
    if (search) {
      const q = search.toLowerCase()
      const hay = `${h.renter_name ?? ''} ${h.month ?? h.payment_month ?? ''} ${h.payment_type ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
  const { page, setPage, pageSize, pageItems } = usePagination(filtered, 10)

  const exportHeaders = ['#', 'Renter', 'Payment Month', 'Rent Amount', 'Deposit Amount', 'Payment Type', 'Payment Date']
  const exportRows = () => filtered.map((h, i) => [
    i + 1, h.renter_name?.trim() || renterLabel || '—', h.month || h.payment_month || '—',
    fmt(h.amount), fmt(h.deposit_amount), h.payment_type || '—', h.payment_date?.slice(0, 10) || '—',
  ])
  const exportExcel = () => {
    const csv = [exportHeaders, ...exportRows()].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'payment-history.csv' })
    a.click()
  }
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Payment History', 14, 14)
    autoTable(doc, {
      head: [exportHeaders],
      body: exportRows().map(r => r.map(String)),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    })
    doc.save('payment-history.pdf')
  }

  const receiptPDF = (h: HistoryRow) => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Payment Receipt', 14, 18)
    doc.setFontSize(11)
    const lines = [
      ['Renter', h.renter_name?.trim() || renterLabel || '—'],
      ['Property', propertyLabel || '—'],
      ['Payment Month', h.month || h.payment_month || '—'],
      ['Rent Amount', fmt(h.amount)],
      ['Deposit Amount', fmt(h.deposit_amount)],
      ['Payment Type', h.payment_type || '—'],
      ['Payment Date', h.payment_date?.slice(0, 10) || '—'],
    ]
    autoTable(doc, { body: lines, startY: 30, styles: { fontSize: 11 }, theme: 'plain' })
    doc.save(`receipt-${h.id}.pdf`)
  }

  const openNew = () => { setNewForm({ payment_month: '', amount: '', deposit_amount: '', payment_type: 'Cash', payment_date: '' }); setShowForm(true) }
  const saveNew = async () => {
    if (!newForm.amount || !newForm.payment_date) return
    setSaving(true); setError('')
    try {
      const res = await fetch(`${API}/payments/lease/${leaseId}/history`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          payment_month: newForm.payment_month,
          amount: parseFloat(newForm.amount) || 0,
          deposit_amount: parseFloat(newForm.deposit_amount) || 0,
          payment_type: newForm.payment_type,
          payment_date: newForm.payment_date,
        }),
      })
      if (!res.ok) throw new Error(`Save failed (${res.status})`)
      setShowForm(false)
      await fetchHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payment')
    } finally { setSaving(false) }
  }

  const openEditHistory = (h: HistoryRow) => {
    setEditingHistory(h)
    setHistoryForm({
      amount: String(h.amount ?? ''), payment_date: h.payment_date?.slice(0, 10) ?? '',
      payment_type: h.payment_type ?? 'Cash', deposit_amount: h.deposit_amount != null ? String(h.deposit_amount) : '',
    })
  }
  const saveEditHistory = async () => {
    if (!editingHistory) return
    try {
      await fetch(`${API}/payments/history/${editingHistory.id}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({
          amount: parseFloat(historyForm.amount) || 0,
          payment_date: historyForm.payment_date,
          payment_type: historyForm.payment_type,
          deposit_amount: parseFloat(historyForm.deposit_amount) || 0,
        }),
      })
      setEditingHistory(null)
      await fetchHistory()
    } catch { setError('Failed to save transaction') }
  }
  const deleteHistory = async (id: number) => {
    if (!confirm('Delete this payment record?')) return
    try {
      await fetch(`${API}/payments/${id}`, { method: 'DELETE', headers: authHeaders() })
      await fetchHistory()
    } catch { setError('Failed to delete record') }
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar af-fade-in">
        <div>
          <button onClick={() => router.push('/dashboard/payments')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', padding: 0, marginBottom: 6 }}>← Back to Payments</button>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Payment History</h1>
          {(renterLabel || propertyLabel) && (
            <p className="af-db-subtitle">{renterLabel}{renterLabel && propertyLabel ? ' · ' : ''}{propertyLabel}</p>
          )}
        </div>
        <button className="af-btn-primary" onClick={openNew} style={{ cursor: 'pointer', border: 'none' }}>+ Add New</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          ↓ Export To Excel
        </button>
        <button onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          ↓ Export To Pdf
        </button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit' }} />
          <span style={{ color: 'var(--muted)' }}>→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit' }} />
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search renter, month, payment type…"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '7px 14px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', width: 260 }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div>
      ) : (
        <div className="af-prop-table-wrap" style={{ overflowX: 'auto' }}>
          <table className="af-prop-table">
            <thead>
              <tr>
                <th>#</th><th>Renter</th><th>Payment Month</th><th>Rent Amount</th><th>Deposit Amount</th>
                <th>Payment Type</th><th>Payment Date</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>No transactions found.</td></tr>
              ) : pageItems.map((h, i) => (
                <tr key={h.id}>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{(page - 1) * pageSize + i + 1}</td>
                  <td style={{ fontWeight: 650 }}>{h.renter_name?.trim() || renterLabel || '—'}</td>
                  <td style={{ fontSize: 13 }}>{h.month || h.payment_month || '—'}</td>
                  <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(h.amount)}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(h.deposit_amount)}</td>
                  <td style={{ fontSize: 13 }}>{h.payment_type || '—'}</td>
                  <td style={{ fontSize: 13 }}>{h.payment_date?.slice(0, 10) || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="af-prop-act edit" onClick={() => openEditHistory(h)} title="Edit">✎</button>
                      <button className="af-prop-act del" onClick={() => deleteHistory(h.id)} title="Delete">🗑</button>
                      <button className="af-prop-act edit" onClick={() => receiptPDF(h)} title="Download PDF Receipt">PDF</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />
        </div>
      )}

      {/* Add New Transaction */}
      {showForm && (
        <div className="af-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="af-modal af-modal-in" onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">Add Payment</h2>
            <div className="af-modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="af-field">
                  <label>Payment Month</label>
                  <input value={newForm.payment_month} onChange={e => setNewForm(f => ({ ...f, payment_month: e.target.value }))} placeholder="e.g. January 2026" />
                </div>
                <div className="af-field">
                  <label>Payment Type</label>
                  <select className="af-select" value={newForm.payment_type} onChange={e => setNewForm(f => ({ ...f, payment_type: e.target.value }))}>
                    {PAYMENT_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                  </select>
                </div>
                <div className="af-field">
                  <label>Rent Amount</label>
                  <input type="number" step="0.01" value={newForm.amount} onChange={e => setNewForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="af-field">
                  <label>Deposit Amount</label>
                  <input type="number" step="0.01" value={newForm.deposit_amount} onChange={e => setNewForm(f => ({ ...f, deposit_amount: e.target.value }))} />
                </div>
                <div className="af-field">
                  <label>Payment Date</label>
                  <DatePicker value={newForm.payment_date} onChange={v => setNewForm(f => ({ ...f, payment_date: v }))} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
              <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={saveNew} disabled={saving}>{saving ? 'Saving…' : 'Add payment'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment History */}
      {editingHistory && (
        <div className="af-modal-overlay" onClick={() => setEditingHistory(null)}>
          <div className="af-modal af-modal-in" onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">Edit Payment History</h2>
            <div className="af-modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="af-field">
                  <label>Rent Amount</label>
                  <input type="number" step="0.01" value={historyForm.amount} onChange={e => setHistoryForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="af-field">
                  <label>Deposit Amount</label>
                  <input type="number" step="0.01" value={historyForm.deposit_amount} onChange={e => setHistoryForm(f => ({ ...f, deposit_amount: e.target.value }))} />
                </div>
                <div className="af-field">
                  <label>Payment Date</label>
                  <DatePicker value={historyForm.payment_date} onChange={v => setHistoryForm(f => ({ ...f, payment_date: v }))} />
                </div>
                <div className="af-field">
                  <label>Payment Type</label>
                  <select className="af-select" value={historyForm.payment_type} onChange={e => setHistoryForm(f => ({ ...f, payment_type: e.target.value }))}>
                    {PAYMENT_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setEditingHistory(null)}>Cancel</button>
              <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={saveEditHistory}>Save changes</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default function PaymentTransactionsPage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <PaymentTransactionsContent />
    </Suspense>
  )
}
