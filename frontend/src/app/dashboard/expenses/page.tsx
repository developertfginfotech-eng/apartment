'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import DatePicker from '@/components/DatePicker'
import Pagination, { usePagination } from '@/components/Pagination'
import { formatDate } from '@/lib/date'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Expense {
  id: number
  date: string
  title: string
  type_name: string | null
  property_name: string | null
  floor_name: string | null
  unit_name: string | null
  amount: string | number
  famount: string | number
  tax: string | number
  description: string | null
}

export default function ExpensesPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const [viewing, setViewing] = useState<Expense | null>(null)

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const fetchExpenses = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (search) params.set('search', search)
      const res = await fetch(`${API}/expenses?${params}`, { headers: authHeaders() })
      if (res.status === 401) { router.push('/login'); return }
      const data = await res.json()
      setExpenses(Array.isArray(data) ? data : [])
    } catch { setError('Failed to load expenses') }
    finally { setLoading(false) }
  }, [from, to, search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  const { page, setPage, pageSize, pageItems } = usePagination(expenses, 10)

  const fmt = (v: string | number | null) => `₱ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const exportHeaders = ['#', 'Date', 'Title', 'Type', 'Property', 'Floor', 'Unit', 'Amount']
  const exportRows = () => expenses.map((e, i) => [
    i + 1, formatDate(e.date), e.title, e.type_name || '—', e.property_name || '—',
    e.floor_name || '—', e.unit_name || '—', fmt(e.amount),
  ])
  const exportExcel = () => {
    const csv = [exportHeaders, ...exportRows()].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'expenses.csv' })
    a.click()
  }
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Expenses List', 14, 14)
    autoTable(doc, {
      head: [exportHeaders],
      body: exportRows().map(r => r.map(String)),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    })
    doc.save('expenses.pdf')
  }

  const deleteExpense = async (id: number) => {
    if (!confirm('Delete this expense?')) return
    try {
      await fetch(`${API}/expenses/${id}`, { method: 'DELETE', headers: authHeaders() })
      fetchExpenses()
    } catch { setError('Failed to delete expense') }
  }

  const runSearch = () => setSearch(searchInput)

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Expenses</h1>
          <p className="af-db-subtitle">{loading ? 'Loading…' : `${expenses.length} expense${expenses.length !== 1 ? 's' : ''} recorded`}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Export To Excel
          </button>
          <button onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Export To Pdf
          </button>
          <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none' }} onClick={() => router.push('/dashboard/expenses/new')}>+ Add New</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="af-field" style={{ margin: 0, minWidth: 150 }}>
          <label style={{ fontSize: 11.5 }}>From Date</label>
          <DatePicker value={from} onChange={setFrom} />
        </div>
        <div style={{ alignSelf: 'center', color: 'var(--muted)', paddingBottom: 8 }}>⇄</div>
        <div className="af-field" style={{ margin: 0, minWidth: 150 }}>
          <label style={{ fontSize: 11.5 }}>To Date</label>
          <DatePicker value={to} onChange={setTo} />
        </div>
        <input
          className="af-prop-search"
          placeholder="Search…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runSearch()}
          style={{ minWidth: 260 }}
        />
        <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none' }} onClick={runSearch}>Search</button>
        {(from || to || search) && (
          <button onClick={() => { setFrom(''); setTo(''); setSearchInput(''); setSearch('') }} style={{ padding: '9px 14px', borderRadius: 8, background: 'none', border: '1px solid var(--border2)', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
        )}
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading expenses…</div>
      ) : (
        <div className="af-prop-table-wrap">
          <table className="af-prop-table">
            <thead>
              <tr>
                <th>#</th><th>Date</th><th>Title</th><th>Type</th>
                <th>Property</th><th>Floor</th><th>Unit</th><th>Amount</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)', padding: '36px 0' }}>No expenses found</td></tr>
              ) : pageItems.map((e, i) => (
                <tr key={e.id}>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{(page - 1) * pageSize + i + 1}</td>
                  <td style={{ fontSize: 13 }}>{formatDate(e.date)}</td>
                  <td style={{ fontWeight: 600, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</td>
                  <td style={{ fontSize: 13 }}>{e.type_name || '—'}</td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>{e.property_name || '—'}</td>
                  <td style={{ fontSize: 13 }}>{e.floor_name || '—'}</td>
                  <td style={{ fontSize: 13 }}>{e.unit_name || '—'}</td>
                  <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(e.amount)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="af-prop-act edit" title="View" onClick={() => setViewing(e)}>👁</button>
                      <button className="af-prop-act edit" title="Edit" onClick={() => router.push(`/dashboard/expenses/edit?id=${e.id}`)}>✏️</button>
                      <button className="af-prop-act del" title="Delete" onClick={() => deleteExpense(e.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageSize={pageSize} totalItems={expenses.length} onPageChange={setPage} />
        </div>
      )}

      {viewing && (
        <div className="af-modal-overlay" onClick={() => setViewing(null)}>
          <div className="af-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">Expense Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {([
                ['Title', viewing.title],
                ['Date', formatDate(viewing.date)],
                ['Type', viewing.type_name || '—'],
                ['Property', viewing.property_name || '—'],
                ['Floor', viewing.floor_name || '—'],
                ['Unit', viewing.unit_name || '—'],
                ['Amount', fmt(viewing.famount)],
                ['Tax', `${viewing.tax || 0}%`],
                ['Final Amount', fmt(viewing.amount)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
                </div>
              ))}
              {viewing.description && (
                <div style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px', gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Description</div>
                  <div style={{ fontSize: 14 }}>{viewing.description}</div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
