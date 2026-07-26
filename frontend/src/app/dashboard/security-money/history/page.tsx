'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from '@/lib/date'
import Pagination, { usePagination } from '@/components/Pagination'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

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

function SecurityMoneyHistoryInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const leaseId = Number(searchParams.get('lease_id'))
  const renterName = searchParams.get('renter_name') ?? ''
  const propertyName = searchParams.get('property_name') ?? ''
  const rentDeposit = searchParams.get('rent_deposit') ?? ''

  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [history, setHistory] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(10)

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('apt_token')}` })
  const fmt = (v: string | number | null | undefined) => `₱ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const fetchHistory = useCallback(async () => {
    if (!leaseId) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/security-money/${leaseId}/history`, { headers: authHeaders() })
      const data = await res.json()
      setHistory(Array.isArray(data) ? data : [])
    } catch { setHistory([]) }
    finally { setLoading(false) }
  }, [leaseId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const filtered = search
    ? history.filter(t =>
        [t.title, t.type, t.reason].some(v => v?.toLowerCase().includes(search.toLowerCase())))
    : history
  const { page, setPage, pageItems } = usePagination(filtered, pageSize)

  const backParams = new URLSearchParams({
    lease_id: String(leaseId), renter_name: renterName, property_name: propertyName, rent_deposit: rentDeposit,
  })

  const exportHeaders = ['#', 'Title', 'Type', 'Amount', 'Payment Date', 'Reason']
  const exportRows = () => filtered.map((t, i) => [i + 1, t.title || '-', t.type, fmt(t.amount), formatDate(t.payment_date), t.reason || '-'])

  const exportCSV = () => {
    const csv = [exportHeaders, ...exportRows()].map(r => r.join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'security-money-history.csv' })
    a.click()
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text('Security Money History', 14, 14)
    autoTable(doc, {
      head: [exportHeaders],
      body: exportRows().map(r => r.map(String)),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    })
    doc.save('security-money-history.pdf')
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Security Money History</h1>
          <p className="af-db-subtitle">
            {renterName}{propertyName ? ` · ${propertyName}` : ''}
            {rentDeposit ? <> · Deposit: <strong style={{ color: '#22c55e' }}>{fmt(rentDeposit)}</strong></> : null}
          </p>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/security-money')}>← Back to Security Money</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none' }} onClick={() => router.push(`/dashboard/security-money/new?${backParams}`)}>+ Add New</button>
        <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          ↓ Export To Excel
        </button>
        <button onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          ↓ Export To Pdf
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
        <div className="af-field" style={{ margin: 0, minWidth: 90 }}>
          <label style={{ fontSize: 11.5 }}>Show</label>
          <select
            className="af-select"
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
            style={{ padding: '8px 10px' }}
          >
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="af-field" style={{ margin: 0 }}>
          <label style={{ fontSize: 11.5 }}>Search</label>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search…"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', width: 220 }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div>
      ) : (
        <div className="af-prop-table-wrap" style={{ overflowX: 'auto' }}>
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
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>No transactions found.</td></tr>
              ) : pageItems.map((tx, i) => (
                <tr key={tx.id}>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{(page - 1) * pageSize + i + 1}</td>
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
          <Pagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />
        </div>
      )}
    </main>
  )
}

export default function SecurityMoneyHistoryPage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <SecurityMoneyHistoryInner />
    </Suspense>
  )
}
