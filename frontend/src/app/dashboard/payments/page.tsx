'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import DatePicker from '@/components/DatePicker'

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

const PAYMENT_TYPES = ['Cash', 'Cheque', 'Pdc Cheque', 'Online']

const TABS = [
  { key: 'rent', label: 'Rent' },
  { key: 'maintenance', label: 'Maintenances' },
  { key: 'utility', label: 'Utilities Bill' },
  { key: 'parking', label: 'Parking Bill' },
  { key: 'interest', label: 'Interest Bill' },
] as const
type TabKey = typeof TABS[number]['key']

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const EMPTY_FORM = { renter_id: '', month: '', year: '', amount: '', status: '0' }

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

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [collecting, setCollecting] = useState<{ kind: 'maintenance' | 'utility'; id: number; amount: string | number; title: string } | null>(null)
  const [collectForm, setCollectForm] = useState({
    payment_type: '', cheque_details: '', cheque_image: null as File | null,
    online_details: '', online_image: null as File | null,
    pdc_cheque_details: '', pdc_cheque_image: null as File | null, pdc_cheque_date: '',
    receipt_image: null as File | null,
  })
  const [collectSaving, setCollectSaving] = useState(false)

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const fetchTab = useCallback(async (tab: TabKey) => {
    setLoading(true); setError('')
    try {
      if (tab === 'rent' || tab === 'interest') {
        const res = await fetch(`${API}/payments/rent-summary${search ? `?search=${encodeURIComponent(search)}` : ''}`, { headers: authHeaders() })
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
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchTab(activeTab) }, [activeTab, fetchTab])

  const fmt = (v: string | number | null) => `₱ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const openHistory = (lease: RentRow) => {
    const params = new URLSearchParams({ leaseId: String(lease.id), renter: lease.renter_name?.trim() || '', property: lease.property_name || '' })
    router.push(`/dashboard/payments/transactions?${params}`)
  }

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

  const openCollect = (kind: 'maintenance' | 'utility', row: { id: number; title: string; amount: string | number }) => {
    setCollecting({ kind, id: row.id, amount: row.amount, title: row.title })
    setCollectForm({
      payment_type: '', cheque_details: '', cheque_image: null,
      online_details: '', online_image: null,
      pdc_cheque_details: '', pdc_cheque_image: null, pdc_cheque_date: '',
      receipt_image: null,
    })
  }
  const closeCollect = () => setCollecting(null)

  const saveCollect = async () => {
    if (!collecting || !collectForm.payment_type) return
    setCollectSaving(true); setError('')
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
      await fetch(`${API}/payments/${collecting.kind}/${collecting.id}/pay`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) })
      closeCollect()
      fetchTab(collecting.kind)
    } catch { setError('Failed to collect payment') }
    finally { setCollectSaving(false) }
  }
  const payParking = async (id: number) => { await fetch(`${API}/payments/parking/${id}/pay`, { method: 'PUT', headers: authHeaders() }); fetchTab('parking') }
  const deleteParking = async (id: number) => { if (!confirm('Delete this parking payment?')) return; await fetch(`${API}/payments/parking/${id}`, { method: 'DELETE', headers: authHeaders() }); fetchTab('parking') }

  // Export (Rent/Interest tab)
  const rentExportHeaders = ['#', 'Renter', 'Property', 'Floor', 'Units', 'Rent Amount', 'Start Date', 'Last Billing', 'Overdue', 'Payment Status', 'Payment Method']
  const rentExportRows = () => rent.map((r, i) => [i + 1, r.renter_name?.trim() || '-', r.property_name || '-', r.floor_name || '-', r.units || '-', fmt(r.rent_amount), r.start_date?.slice(0, 10), r.lastbill_date?.slice(0, 10) || '-', r.overdueMonths.join(', ') || '-', r.payment_status, r.payment_method || '-'])
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

  const openNewPayment = () => { setForm(EMPTY_FORM); setShowForm(true) }
  const savePayment = async () => {
    if (!form.renter_id || !form.month || !form.year || !form.amount) return
    setSaving(true); setError('')
    try {
      await fetch(`${API}/payments`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          renter_id: parseInt(form.renter_id, 10), month: parseInt(form.month, 10),
          year: parseInt(form.year, 10), amount: parseFloat(form.amount), status: parseInt(form.status, 10),
        }),
      })
      setShowForm(false)
      fetchTab('rent')
    } catch { setError('Failed to save payment') }
    finally { setSaving(false) }
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
            <button className="af-btn-primary" onClick={openNewPayment} style={{ cursor: 'pointer', border: 'none' }}>+ New Payment</button>
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchTab(activeTab)} placeholder="Search renter, property, amount…"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '7px 14px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', width: 260 }} />
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
                ) : rent.map((r, i) => (
                  <tr key={r.id} className="af-row-in" style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}>
                    <td style={{ fontWeight: 650 }}>{r.renter_name?.trim() || '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--muted)' }}>{r.property_name || '—'}</td>
                    <td style={{ fontSize: 13 }}>{r.floor_name || '—'}</td>
                    <td><span className="af-prop-badge type">{r.units || '—'}</span></td>
                    <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(r.rent_amount)}</td>
                    <td style={{ fontSize: 12.5 }}>{r.start_date?.slice(0, 10)}</td>
                    <td style={{ fontSize: 12.5 }}>{r.lastbill_date?.slice(0, 10) || '—'}</td>
                    <td style={{ fontSize: 12, maxWidth: 220 }}>{r.overdueMonths.length ? r.overdueMonths.join(', ') : '—'}</td>
                    <td>
                      <span className={`af-status-pill ${r.payment_status === 'Pending' ? 'af-pulse' : ''}`} style={{ background: r.payment_status === 'Paid' ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.12)', color: r.payment_status === 'Paid' ? '#22c55e' : '#f97316' }}>{r.payment_status}</span>
                    </td>
                    <td style={{ fontSize: 13 }}>{r.payment_method || '—'}</td>
                    <td><button className="af-prop-act edit" onClick={() => openHistory(r)}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'maintenance' && (
            <table className="af-prop-table">
              <thead><tr><th>Title</th><th>Property</th><th>Date</th><th>Amount</th><th>Details</th><th>Payment Method</th><th>Status</th><th>Payment</th></tr></thead>
              <tbody>
                {maintenance.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>No maintenance bills found</td></tr>
                ) : maintenance.map((m, i) => (
                  <tr key={m.id} className="af-row-in" style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}>
                    <td style={{ fontWeight: 650 }}>{m.title}</td>
                    <td style={{ fontSize: 13, color: 'var(--muted)' }}>{m.property_name || '—'}</td>
                    <td style={{ fontSize: 13 }}>{m.date?.slice(0, 10)}</td>
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

          {activeTab === 'utility' && (
            <table className="af-prop-table">
              <thead><tr><th>Property</th><th>Total Bill</th><th>Issue Date</th><th>Payment Method</th><th>Status</th><th>Payment</th></tr></thead>
              <tbody>
                {utility.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>No utility bills found</td></tr>
                ) : utility.map((u, i) => (
                  <tr key={u.id} className="af-row-in" style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}>
                    <td style={{ fontWeight: 650 }}>{u.property_name || '—'}</td>
                    <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(u.total_rent)}</td>
                    <td style={{ fontSize: 13 }}>{u.issue_date?.slice(0, 10)}</td>
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

          {activeTab === 'parking' && (
            <table className="af-prop-table">
              <thead><tr><th>Renter</th><th>Property</th><th>Amount</th><th>Payment Date</th><th>Payment Method</th><th>Status</th><th>Payment</th><th>Action</th></tr></thead>
              <tbody>
                {parking.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>No parking bills found</td></tr>
                ) : parking.map((p, i) => (
                  <tr key={p.id} className="af-row-in" style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}>
                    <td style={{ fontWeight: 650 }}>{p.renter_name?.trim() || '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--muted)' }}>{p.property_name || '—'}</td>
                    <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(p.price)}</td>
                    <td style={{ fontSize: 13 }}>{p.payment_date?.slice(0, 10)}</td>
                    <td style={{ fontSize: 13 }}>{p.payment_type || '—'}</td>
                    <td><span className={`af-status-pill ${p.payment_status !== '1' ? 'af-pulse' : ''}`} style={{ background: p.payment_status === '1' ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.12)', color: p.payment_status === '1' ? '#22c55e' : '#f97316' }}>{p.payment_status === '1' ? 'Paid' : 'Pending'}</span></td>
                    <td>{p.payment_status === '1' ? <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span> : <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none', padding: '6px 14px', fontSize: 12 }} onClick={() => payParking(p.id)}>Pay Now</button>}</td>
                    <td><button className="af-prop-act del" onClick={() => deleteParking(p.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showForm && (
        <div className="af-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="af-modal af-modal-in" onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">New Payment</h2>
            <div className="af-modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="af-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Renter ID</label>
                  <input type="number" value={form.renter_id} onChange={e => setForm(f => ({ ...f, renter_id: e.target.value }))} placeholder="e.g. 1" />
                </div>
                <div className="af-field">
                  <label>Month</label>
                  <select className="af-select" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))}>
                    <option value="">-- Select --</option>
                    {MONTH_NAMES.slice(1).map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
                  </select>
                </div>
                <div className="af-field"><label>Year</label><input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2026" /></div>
                <div className="af-field"><label>Amount</label><input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" /></div>
                <div className="af-field">
                  <label>Status</label>
                  <select className="af-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="0">Pending</option>
                    <option value="1">Paid</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
              <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px', opacity: saving ? 0.7 : 1 }} onClick={savePayment} disabled={saving}>{saving ? 'Saving…' : 'Create payment'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Collect (Maintenance / Utility) */}
      {collecting && (
        <div className="af-modal-overlay" onClick={closeCollect}>
          <div className="af-modal af-modal-in" onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">{collecting.kind === 'maintenance' ? 'Maintenance Collect' : 'Utility Collect'}</h2>
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
                    <input type="file" accept="image/*,.pdf" onChange={e => setCollectForm(f => ({ ...f, cheque_image: e.target.files?.[0] ?? null }))} />
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
                    <input type="file" accept="image/*,.pdf" onChange={e => setCollectForm(f => ({ ...f, pdc_cheque_image: e.target.files?.[0] ?? null }))} />
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
                    <input type="file" accept="image/*,.pdf" onChange={e => setCollectForm(f => ({ ...f, online_image: e.target.files?.[0] ?? null }))} />
                  </div>
                </div>
              )}

              <div style={{ marginTop: 14, borderTop: '1px solid var(--border2)', paddingTop: 14 }}>
                <div className="af-field">
                  <label>{collecting.kind === 'maintenance' ? 'Total Maintenance' : 'Total Bill'}</label>
                  <input value={fmt(collecting.amount)} readOnly disabled />
                </div>
                <div className="af-field">
                  <label>Receipt Image</label>
                  <input type="file" accept="image/*,.pdf" onChange={e => setCollectForm(f => ({ ...f, receipt_image: e.target.files?.[0] ?? null }))} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={closeCollect} disabled={collectSaving}>Close</button>
              <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px', opacity: collectSaving ? 0.7 : 1 }} onClick={saveCollect} disabled={collectSaving || !collectForm.payment_type}>
                {collectSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
