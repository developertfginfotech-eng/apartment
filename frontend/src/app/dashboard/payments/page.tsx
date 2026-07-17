'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Pagination, { usePagination } from '@/components/Pagination'
import DatePicker from '@/components/DatePicker'
import { formatDate } from '@/lib/date'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface RentRow {
  id: number
  renter_name: string
  property_name: string | null
  floor_name: string | null
  units: string | null
  rent_amount: string | number
  start_date: string
  lastbill_date: string | null
  overdueMonths: string[]
  payment_status: 'Paid' | 'Pending'
  payment_method: string | null
}
interface MaintenanceRow {
  id: number; title: string; amount: string | number; date: string; description: string | null
  payment_type: string; payment_status: number; property_name: string | null; receipt_image: string | null
  cheque_details: string | null; cheque_image: string | null
  online_details: string | null; online_image: string | null
  pdc_cheque_details: string | null; pdc_cheque_image: string | null; pdc_cheque_date: string | null
}
interface UtilityRow {
  id: number; total_rent: string | number; issue_date: string
  payment_type: string; payment_status: number; property_name: string | null; receipt_image: string | null
  cheque_details: string | null; cheque_image: string | null
  online_details: string | null; online_image: string | null
  pdc_cheque_details: string | null; pdc_cheque_image: string | null; pdc_cheque_date: string | null
}
interface ParkingRow { id: number; renter_name: string | null; property_name: string | null; price: string | number; payment_date: string; payment_type: string; payment_status: string }

const TABS = [
  { key: 'rent', label: 'Rent' },
  { key: 'maintenance', label: 'Maintenances' },
  { key: 'utility', label: 'Utilities Bill' },
  { key: 'parking', label: 'Parking Bill' },
  { key: 'interest', label: 'Interest Bill' },
] as const
type TabKey = typeof TABS[number]['key']

function useCountUp(value: number, durationMs = 600) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const from = prev.current
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (value - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
      else prev.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, durationMs])
  return display
}

function StatCard({ label, value, color, delay = 0, isMoney = false }: { label: string; value: number; color: string; delay?: number; isMoney?: boolean }) {
  const shown = useCountUp(value)
  return (
    <div className="af-stat-card af-fade-in" style={{ animationDelay: `${delay}s`, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: '18px 22px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 820, letterSpacing: '-0.03em', color, fontVariantNumeric: 'tabular-nums' }}>
        {isMoney ? '₱ ' : ''}{shown.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
    </div>
  )
}

export default function PaymentsPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [activeTab, setActiveTab] = useState<TabKey>('rent')
  const [rent, setRent] = useState<RentRow[]>([])
  const [maintenance, setMaintenance] = useState<MaintenanceRow[]>([])
  const [utility, setUtility] = useState<UtilityRow[]>([])
  const [parking, setParking] = useState<ParkingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const fetchTab = useCallback(async (tab: TabKey) => {
    setLoading(true); setError('')
    try {
      if (tab === 'rent' || tab === 'interest') {
        const params = new URLSearchParams()
        if (from) params.set('from', from)
        if (to) params.set('to', to)
        if (search) params.set('search', search)
        const res = await fetch(`${API}/payments/rent-summary?${params}`, { headers: authHeaders() })
        setRent(await res.json())
      } else if (tab === 'maintenance') {
        const res = await fetch(`${API}/payments/maintenance`, { headers: authHeaders() })
        setMaintenance(await res.json())
      } else if (tab === 'utility') {
        const res = await fetch(`${API}/payments/utility`, { headers: authHeaders() })
        setUtility(await res.json())
      } else if (tab === 'parking') {
        const res = await fetch(`${API}/payments/parking`, { headers: authHeaders() })
        setParking(await res.json())
      }
    } catch { setError('Failed to load data') }
    finally { setLoading(false) }
  }, [search, from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchTab(activeTab) }, [activeTab, fetchTab])

  const fmt = (v: string | number | null) => `₱ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const rentPage = usePagination(rent, 10)
  const maintenancePage = usePagination(maintenance, 10)
  const utilityPage = usePagination(utility, 10)
  const parkingPage = usePagination(parking, 10)

  const openHistory = (lease: RentRow) => {
    const params = new URLSearchParams({ leaseId: String(lease.id), renter: lease.renter_name?.trim() || '', property: lease.property_name || '' })
    router.push(`/dashboard/payments/transactions?${params}`)
  }

  const openCollect = (kind: 'maintenance' | 'utility', row: { id: number; title: string; amount: string | number }) => {
    const params = new URLSearchParams({ kind, id: String(row.id), amount: String(row.amount), title: row.title })
    router.push(`/dashboard/payments/collect?${params}`)
  }
  const payParking = async (id: number) => { await fetch(`${API}/payments/parking/${id}/pay`, { method: 'PUT', headers: authHeaders() }); fetchTab('parking') }
  const deleteParking = async (id: number) => { if (!confirm('Delete this parking payment?')) return; await fetch(`${API}/payments/parking/${id}`, { method: 'DELETE', headers: authHeaders() }); fetchTab('parking') }

  // Export (Rent/Interest tab)
  const rentExportHeaders = ['#', 'Renter', 'Property', 'Floor', 'Units', 'Rent Amount', 'Start Date', 'Last Billing', 'Overdue', 'Payment Status', 'Payment Method']
  const rentExportRows = () => rent.map((r, i) => [i + 1, r.renter_name?.trim() || '-', r.property_name || '-', r.floor_name || '-', r.units || '-', fmt(r.rent_amount), formatDate(r.start_date), formatDate(r.lastbill_date), r.overdueMonths.join(', ') || '-', r.payment_status, r.payment_method || '-'])
  const exportCSV = () => {
    const csv = [rentExportHeaders, ...rentExportRows()].map(row => row.map(c => `"${c}"`).join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `${activeTab}-payments.csv` })
    a.click()
  }
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Payment List', 14, 14)
    autoTable(doc, { head: [rentExportHeaders], body: rentExportRows().map(r => r.map(String)), startY: 20, styles: { fontSize: 7 }, headStyles: { fillColor: [249, 115, 22] } })
    doc.save(`${activeTab}-payments.pdf`)
  }

  const collected = rent.filter(r => r.payment_status === 'Paid').length
  const pending = rent.filter(r => r.payment_status === 'Pending').length
  const totalRent = rent.reduce((s, r) => s + Number(r.rent_amount), 0)

  return (
    <main className="af-db-main">
      <div className="af-db-topbar af-fade-in">
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Payment List</h1>
          <p className="af-db-subtitle">Rent, maintenance, utility, parking &amp; interest billing</p>
        </div>
        {activeTab === 'rent' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>↓ Export To Excel</button>
            <button onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>↓ Export To Pdf</button>
            <button className="af-btn-primary" onClick={() => router.push('/dashboard/payments/new')} style={{ cursor: 'pointer', border: 'none' }}>+ New Payment</button>
          </div>
        )}
      </div>

      <div className="af-tab-bar af-fade-in" style={{ animationDelay: '0.06s' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={`af-tab-pill ${activeTab === t.key ? 'active' : ''}`}>{t.label}</button>
        ))}
      </div>

      {(activeTab === 'rent' || activeTab === 'interest') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 22 }}>
          <StatCard label="Total Rent Roll" value={totalRent} color="var(--accent)" delay={0} isMoney />
          <StatCard label="Paid This Month" value={collected} color="#22c55e" delay={0.05} />
          <StatCard label="Pending This Month" value={pending} color="#f97316" delay={0.1} />
        </div>
      )}

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      {(activeTab === 'rent' || activeTab === 'interest') && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DatePicker value={from} onChange={setFrom} />
            <span style={{ color: 'var(--muted)' }}>⇄</span>
            <DatePicker value={to} onChange={setTo} />
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchTab(activeTab)} placeholder="Search renter, property, amount…"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '7px 14px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', width: 260 }} />
          {(from || to) && (
            <button onClick={() => { setFrom(''); setTo('') }} style={{ padding: '7px 12px', borderRadius: 8, background: 'none', border: '1px solid var(--border2)', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div>
      ) : (
        <div key={activeTab} className="af-prop-table-wrap af-fade-in" style={{ overflowX: 'auto' }}>
          {(activeTab === 'rent' || activeTab === 'interest') && (
            <table className="af-prop-table" style={{ minWidth: 1150 }}>
              <thead>
                <tr>
                  <th>Renter</th><th>Property</th><th>Floor</th><th>Units</th><th>Rent Amount</th>
                  <th>Start Date</th><th>Last Billing</th><th>Overdue</th><th>Payment Status</th><th>Payment Method</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rent.length === 0 ? (
                  <tr><td colSpan={11} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>No leases found</td></tr>
                ) : rentPage.pageItems.map((r, i) => (
                  <tr key={r.id} className="af-row-in" style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}>
                    <td style={{ fontWeight: 650 }}>{r.renter_name?.trim() || '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--muted)' }}>{r.property_name || '—'}</td>
                    <td style={{ fontSize: 13 }}>{r.floor_name || '—'}</td>
                    <td><span className="af-prop-badge type">{r.units || '—'}</span></td>
                    <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(r.rent_amount)}</td>
                    <td style={{ fontSize: 12.5 }}>{formatDate(r.start_date)}</td>
                    <td style={{ fontSize: 12.5 }}>{formatDate(r.lastbill_date)}</td>
                    <td style={{ fontSize: 12, maxWidth: 220 }}>{r.overdueMonths.length ? r.overdueMonths.join(', ') : '—'}</td>
                    <td>
                      <span className={`af-status-pill ${r.payment_status === 'Pending' ? 'af-pulse' : ''}`} style={{ background: r.payment_status === 'Paid' ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.12)', color: r.payment_status === 'Paid' ? '#22c55e' : '#f97316' }}>{r.payment_status}</span>
                    </td>
                    <td style={{ fontSize: 13 }}>{r.payment_method || '—'}</td>
                    <td><button className="af-prop-act edit" title="Manage payments" onClick={() => openHistory(r)}>✏️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {(activeTab === 'rent' || activeTab === 'interest') && (
            <Pagination page={rentPage.page} pageSize={rentPage.pageSize} totalItems={rent.length} onPageChange={rentPage.setPage} />
          )}

          {activeTab === 'maintenance' && (
            <table className="af-prop-table">
              <thead><tr><th>Title</th><th>Property</th><th>Date</th><th>Amount</th><th>Details</th><th>Payment Method</th><th>Status</th><th>Payment</th></tr></thead>
              <tbody>
                {maintenance.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>No maintenance bills found</td></tr>
                ) : maintenancePage.pageItems.map((m, i) => (
                  <tr key={m.id} className="af-row-in" style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}>
                    <td style={{ fontWeight: 650 }}>{m.title}</td>
                    <td style={{ fontSize: 13, color: 'var(--muted)' }}>{m.property_name || '—'}</td>
                    <td style={{ fontSize: 13 }}>{formatDate(m.date)}</td>
                    <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(m.amount)}</td>
                    <td style={{ fontSize: 13, color: 'var(--muted)' }}>{m.description || '—'}</td>
                    <td style={{ fontSize: 13 }}>{m.payment_type || '—'}</td>
                    <td><span className={`af-status-pill ${m.payment_status === 0 ? 'af-pulse' : ''}`} style={{ background: m.payment_status === 1 ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.12)', color: m.payment_status === 1 ? '#22c55e' : '#f97316' }}>{m.payment_status === 1 ? 'Paid' : 'Pending'}</span></td>
                    <td>
                      {m.payment_status === 1
                        ? (m.receipt_image
                            ? <a href={`${API}${m.receipt_image}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)' }}>View Receipt</a>
                            : <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>)
                        : <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none', padding: '6px 14px', fontSize: 12 }} onClick={() => openCollect('maintenance', { id: m.id, title: m.title, amount: m.amount })}>Pay Now</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {activeTab === 'maintenance' && (
            <Pagination page={maintenancePage.page} pageSize={maintenancePage.pageSize} totalItems={maintenance.length} onPageChange={maintenancePage.setPage} />
          )}

          {activeTab === 'utility' && (
            <table className="af-prop-table">
              <thead><tr><th>Property</th><th>Total Bill</th><th>Issue Date</th><th>Payment Method</th><th>Status</th><th>Payment</th></tr></thead>
              <tbody>
                {utility.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>No utility bills found</td></tr>
                ) : utilityPage.pageItems.map((u, i) => (
                  <tr key={u.id} className="af-row-in" style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}>
                    <td style={{ fontWeight: 650 }}>{u.property_name || '—'}</td>
                    <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(u.total_rent)}</td>
                    <td style={{ fontSize: 13 }}>{formatDate(u.issue_date)}</td>
                    <td style={{ fontSize: 13 }}>{u.payment_type || '—'}</td>
                    <td><span className={`af-status-pill ${u.payment_status === 0 ? 'af-pulse' : ''}`} style={{ background: u.payment_status === 1 ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.12)', color: u.payment_status === 1 ? '#22c55e' : '#f97316' }}>{u.payment_status === 1 ? 'Paid' : 'Pending'}</span></td>
                    <td>
                      {u.payment_status === 1
                        ? (u.receipt_image
                            ? <a href={`${API}${u.receipt_image}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)' }}>View Receipt</a>
                            : <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>)
                        : <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none', padding: '6px 14px', fontSize: 12 }} onClick={() => openCollect('utility', { id: u.id, title: u.property_name || 'Utility Bill', amount: u.total_rent })}>Pay Now</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {activeTab === 'utility' && (
            <Pagination page={utilityPage.page} pageSize={utilityPage.pageSize} totalItems={utility.length} onPageChange={utilityPage.setPage} />
          )}

          {activeTab === 'parking' && (
            <table className="af-prop-table">
              <thead><tr><th>Renter</th><th>Property</th><th>Amount</th><th>Payment Date</th><th>Payment Method</th><th>Status</th><th>Payment</th><th>Action</th></tr></thead>
              <tbody>
                {parking.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>No parking bills found</td></tr>
                ) : parkingPage.pageItems.map((p, i) => (
                  <tr key={p.id} className="af-row-in" style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}>
                    <td style={{ fontWeight: 650 }}>{p.renter_name?.trim() || '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--muted)' }}>{p.property_name || '—'}</td>
                    <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(p.price)}</td>
                    <td style={{ fontSize: 13 }}>{formatDate(p.payment_date)}</td>
                    <td style={{ fontSize: 13 }}>{p.payment_type || '—'}</td>
                    <td><span className={`af-status-pill ${p.payment_status !== '1' ? 'af-pulse' : ''}`} style={{ background: p.payment_status === '1' ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.12)', color: p.payment_status === '1' ? '#22c55e' : '#f97316' }}>{p.payment_status === '1' ? 'Paid' : 'Pending'}</span></td>
                    <td>{p.payment_status === '1' ? <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span> : <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none', padding: '6px 14px', fontSize: 12 }} onClick={() => payParking(p.id)}>Pay Now</button>}</td>
                    <td><button className="af-prop-act del" title="Delete" onClick={() => deleteParking(p.id)}>🗑️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {activeTab === 'parking' && (
            <Pagination page={parkingPage.page} pageSize={parkingPage.pageSize} totalItems={parking.length} onPageChange={parkingPage.setPage} />
          )}
        </div>
      )}

    </main>
  )
}
