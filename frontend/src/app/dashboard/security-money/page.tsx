'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import DatePicker from '@/components/DatePicker'
import FileDropInput from '@/components/FileDropInput'
import { formatDate } from '@/lib/date'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Lease {
  id: number
  renter_name: string
  property_name: string
  floor_name: string | null
  units: string | null
  rent_amount: string | number
  rent_deposit: string | number | null
}

interface Transaction {
  id: number
  lease_id: number
  amount: string | number
  title: string
  reason: string | null
  type: 'add' | 'deduct'
  payment_date: string
  payment_type: string | null
  receipt_image: string | null
}

const PAYMENT_TYPES = ['Cash', 'Cheque', 'Pdc Cheque', 'Online']

const EMPTY_FORM = { title: '', amount: '', type: 'add' as 'add' | 'deduct', payment_date: '', payment_type: 'Cash', reason: '', receiptFile: null as File | null }

export default function SecurityMoneyPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [leases, setLeases] = useState<Lease[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')

  const [selectedLease, setSelectedLease] = useState<Lease | null>(null)
  const [history, setHistory] = useState<Transaction[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const fetchLeases = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      const res = await fetch(`${API}/security-money?${params}`, { headers: authHeaders() })
      const data = await res.json()
      setLeases(data.data ?? [])
      setTotal(data.total ?? 0)
      setPages(data.pages ?? 1)
    } catch { setError('Failed to load security money data') }
    finally { setLoading(false) }
  }, [page, limit, search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchLeases() }, [fetchLeases])

  const fmt = (v: string | number | null) => `₱ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const exportHeaders = ['#', 'Renter Name', 'Property Name', 'Floor', 'Units', 'Rent Amount', 'Deposit Amount']
  const exportRows = () => leases.map((l, i) => [i + 1, l.renter_name?.trim() || '-', l.property_name || '-', l.floor_name || '-', l.units || '-', fmt(l.rent_amount), fmt(l.rent_deposit)])

  const exportCSV = () => {
    const csv = [exportHeaders, ...exportRows()].map(r => r.join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'security-money.csv' })
    a.click()
  }

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Security Money List', 14, 14)
    autoTable(doc, {
      head: [exportHeaders],
      body: exportRows().map(r => r.map(String)),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    })
    doc.save('security-money.pdf')
  }

  const historyExportHeaders = ['#', 'Title', 'Type', 'Payment Date', 'Reason']
  const historyExportRows = () => history.map((t, i) => [i + 1, t.title || '-', t.type, formatDate(t.payment_date), t.reason || '-'])

  const exportHistoryCSV = () => {
    const csv = [historyExportHeaders, ...historyExportRows()].map(r => r.join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'security-money-history.csv' })
    a.click()
  }

  const exportHistoryPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text('Security Money History', 14, 14)
    autoTable(doc, {
      head: [historyExportHeaders],
      body: historyExportRows().map(r => r.map(String)),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    })
    doc.save('security-money-history.pdf')
  }

  const fetchHistory = useCallback(async (leaseId: number) => {
    setHistoryLoading(true)
    try {
      const res = await fetch(`${API}/security-money/${leaseId}/history`, { headers: authHeaders() })
      const data = await res.json()
      setHistory(Array.isArray(data) ? data : [])
    } catch { setHistory([]) }
    finally { setHistoryLoading(false) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openHistory = (lease: Lease) => { setSelectedLease(lease); fetchHistory(lease.id) }
  const closeHistory = () => { setSelectedLease(null); setHistory([]); setShowForm(false) }

  const openAdd = () => { setForm(EMPTY_FORM); setShowForm(true) }

  const [uploading, setUploading] = useState(false)

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

  const submitTransaction = async () => {
    if (!selectedLease || !form.title || !form.amount || !form.payment_date) return
    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0) return

    setUploading(true)
    try {
      let receiptUrl: string | null = null
      if (form.receiptFile) receiptUrl = await uploadReceipt(form.receiptFile)

      await fetch(`${API}/security-money/${selectedLease.id}/history`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: form.title, amount: amt, type: form.type,
          payment_date: form.payment_date, payment_type: form.payment_type, reason: form.reason || null,
          receipt_image: receiptUrl,
        }),
      })
      setShowForm(false)
      await fetchHistory(selectedLease.id)
      await fetchLeases()
    } catch { setError('Failed to save transaction') }
    finally { setUploading(false) }
  }

  const getPageNums = () => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
    const nums: (number | '...')[] = []
    const delta = 2
    const left = Math.max(2, page - delta)
    const right = Math.min(pages - 1, page + delta)
    nums.push(1)
    if (left > 2) nums.push('...')
    for (let i = left; i <= right; i++) nums.push(i)
    if (right < pages - 1) nums.push('...')
    nums.push(pages)
    return nums
  }
  const pageNums = getPageNums()

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Security Money</h1>
          <p className="af-db-subtitle">Security deposits and refund tracking</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Export To Excel
          </button>
          <button onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Export To Pdf
          </button>
        </div>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
          Show
          <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1) }} style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 7, color: 'var(--text)', fontSize: 11.5, padding: '5px 8px', fontFamily: 'inherit', cursor: 'pointer', maxWidth: 70 }}>
            {[10, 25, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          entries
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
          Search:
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Renter, property, amount…"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '6px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', width: 220 }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading security money data…</div>
      ) : (
        <div className="af-prop-table-wrap">
          <table className="af-prop-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Renter Name</th>
                <th>Property Name</th>
                <th>Floor</th>
                <th>Units</th>
                <th>Rent Amount</th>
                <th>Deposit Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {leases.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>No records found</td></tr>
              ) : leases.map((l, i) => (
                <tr key={l.id}>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{(page - 1) * limit + i + 1}</td>
                  <td style={{ fontWeight: 650 }}>{l.renter_name?.trim() || '—'}</td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>{l.property_name || '—'}</td>
                  <td>{l.floor_name || '—'}</td>
                  <td>{l.units || '—'}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(l.rent_amount)}</td>
                  <td style={{ fontWeight: 700, color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>{fmt(l.rent_deposit)}</td>
                  <td>
                    <button
                      className="af-btn-secondary"
                      style={{ cursor: 'pointer', padding: '6px 12px', fontSize: 12.5 }}
                      onClick={() => openHistory(l)}
                    >
                      Edit / History
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontFamily: 'inherit', fontSize: 13 }}>‹</button>
          {pageNums.map((n, i) =>
            n === '...'
              ? <span key={`e${i}`} style={{ color: 'var(--muted)', fontSize: 13, padding: '0 4px' }}>…</span>
              : <button key={n} onClick={() => setPage(n as number)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border2)', background: page === n ? 'var(--accent)' : 'var(--surface2)', color: page === n ? '#fff' : 'var(--text)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: page === n ? 700 : 500 }}>
                  {n}
                </button>
          )}
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', cursor: page === pages ? 'not-allowed' : 'pointer', opacity: page === pages ? 0.4 : 1, fontFamily: 'inherit', fontSize: 13 }}>›</button>
          <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} entries</span>
        </div>
      )}

      {!loading && pages <= 1 && leases.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>Showing {leases.length} of {total} entries</div>
      )}

      {/* History Modal */}
      {selectedLease && (
        <div className="af-modal-overlay" onClick={closeHistory}>
          <div className="af-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <h2 className="af-modal-title">Security Money History</h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                  {selectedLease.renter_name?.trim()} · {selectedLease.property_name} · Deposit: <strong style={{ color: '#22c55e' }}>{fmt(selectedLease.rent_deposit)}</strong>
                </p>
              </div>
              <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none', flexShrink: 0 }} onClick={openAdd}>+ Add New</button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <button onClick={exportHistoryCSV} style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Export To Excel</button>
              <button onClick={exportHistoryPDF} style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Export To Pdf</button>
            </div>

            {historyLoading ? (
              <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>Loading…</p>
            ) : (
              <div className="af-prop-table-wrap" style={{ maxHeight: 340, overflowY: 'auto' }}>
                <table className="af-prop-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Payment Date</th>
                      <th>Reason</th>
                      <th>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>No transactions found.</td></tr>
                    ) : history.map((tx, i) => (
                      <tr key={tx.id}>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{i + 1}</td>
                        <td style={{ fontWeight: 650 }}>{tx.title}</td>
                        <td>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100,
                            background: tx.type === 'add' ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.14)',
                            color: tx.type === 'add' ? '#22c55e' : '#ef4444',
                            textTransform: 'uppercase',
                          }}>
                            {tx.type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: tx.type === 'add' ? '#22c55e' : '#ef4444' }}>
                          {tx.type === 'add' ? '+' : '-'}{fmt(tx.amount)}
                        </td>
                        <td style={{ fontSize: 13 }}>{formatDate(tx.payment_date)}</td>
                        <td style={{ fontSize: 13, color: 'var(--muted)' }}>{tx.reason || '—'}</td>
                        <td style={{ fontSize: 13 }}>
                          {tx.receipt_image ? <a href={`${API}${tx.receipt_image}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>View</a> : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={closeHistory}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showForm && selectedLease && (
        <div className="af-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="af-modal" onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">Add Security Money Transaction</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              {selectedLease.renter_name?.trim()} · Current deposit: <strong style={{ color: '#22c55e' }}>{fmt(selectedLease.rent_deposit)}</strong>
            </p>
            <div className="af-modal-form">
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
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setShowForm(false)} disabled={uploading}>Cancel</button>
              <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px', opacity: uploading ? 0.7 : 1 }} onClick={submitTransaction} disabled={uploading}>{uploading ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
