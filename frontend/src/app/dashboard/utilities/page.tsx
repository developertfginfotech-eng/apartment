'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import DatePicker from '@/components/DatePicker'
import Pagination, { usePagination } from '@/components/Pagination'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface UtilityBill {
  id: number
  renter_name: string | null
  property_name: string | null
  floor_name: string | null
  unit_name: string | null
  month: string | null
  water_bill: string | number
  water_bill_due_from: string | null
  water_bill_due_to: string | null
  electric_bill: string | number
  electric_bill_due_from: string | null
  electric_bill_due_to: string | null
  gas_bill: string | number
  security_bill: string | number
  cusa: string | number
  other_bill: string | number
  total_rent: string | number
  interest: string | number | null
  issue_date: string | null
  payment_type: string | null
  payment_mode: string | null
  payment_status: number
}

const bill = (b: UtilityBill) => Number(b.water_bill) + Number(b.electric_bill) + Number(b.gas_bill) + Number(b.security_bill) + Number(b.cusa) + Number(b.other_bill)

const EMPTY_FORM = {
  renter_id: '', property_id: '', month: '',
  water_bill: '', water_bill_due_from: '', water_bill_due_to: '',
  electric_bill: '', electric_bill_due_from: '', electric_bill_due_to: '',
  gas_bill: '', security_bill: '', cusa: '', other_bill: '', interest: '', issue_date: '',
}

export default function UtilitiesPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [bills, setBills] = useState<UtilityBill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<UtilityBill | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [renters, setRenters] = useState<{ id: number; name: string }[]>([])
  const [properties, setProperties] = useState<{ id: number; property_name: string }[]>([])

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const fetchBills = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/utility`, { headers: authHeaders() })
      setBills(await res.json())
    } catch { setError('Failed to load utility bills') }
    finally { setLoading(false) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchBills() }, [fetchBills])

  useEffect(() => {
    fetch(`${API}/renters`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setRenters(d)).catch(() => {})
    fetch(`${API}/properties`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setProperties(d)).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = filter === 'all' ? bills : bills.filter(b => filter === 'paid' ? b.payment_status === 1 : b.payment_status !== 1)
  const { page, setPage, pageSize, pageItems } = usePagination(filtered, 10)

  const fmt = (v: string | number) => `₱ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const billTotal = (b: UtilityBill) => Number(b.total_rent) || bill(b)
  const totalAll = bills.reduce((s, b) => s + billTotal(b), 0)
  const paidCount = bills.filter(b => b.payment_status === 1).length
  const unpaidCount = bills.filter(b => b.payment_status !== 1).length
  const paidAmount = bills.filter(b => b.payment_status === 1).reduce((s, b) => s + billTotal(b), 0)
  const unpaidAmount = bills.filter(b => b.payment_status !== 1).reduce((s, b) => s + billTotal(b), 0)

  const exportHeaders = ['#', 'Renter', 'Property', 'Floor', 'Unit', 'Month', 'Water Bill', 'Electric Bill', 'Cusa', 'Other', 'Total', 'Interest', 'Status', 'Pay Date']
  const exportRows = () => filtered.map((b, i) => [
    i + 1, b.renter_name?.trim() || '—', b.property_name || '—', b.floor_name || '—', b.unit_name || '—',
    b.month || '—', fmt(b.water_bill), fmt(b.electric_bill), fmt(b.cusa), fmt(b.other_bill),
    fmt(billTotal(b)), b.interest ? fmt(b.interest) : '—', b.payment_status === 1 ? 'paid' : 'unpaid',
    b.issue_date?.slice(0, 10) || '—',
  ])

  const exportExcel = () => {
    const csv = [exportHeaders, ...exportRows()].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'utility-bills.csv' })
    a.click()
  }

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Utility Bills', 14, 14)
    autoTable(doc, {
      head: [exportHeaders],
      body: exportRows().map(r => r.map(String)),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    })
    doc.save('utility-bills.pdf')
  }

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (b: UtilityBill) => {
    setEditing(b)
    setForm({
      renter_id: '', property_id: '', month: b.month ?? '',
      water_bill: String(b.water_bill ?? 0), water_bill_due_from: b.water_bill_due_from ?? '', water_bill_due_to: b.water_bill_due_to ?? '',
      electric_bill: String(b.electric_bill ?? 0), electric_bill_due_from: b.electric_bill_due_from ?? '', electric_bill_due_to: b.electric_bill_due_to ?? '',
      gas_bill: String(b.gas_bill ?? 0), security_bill: String(b.security_bill ?? 0),
      cusa: String(b.cusa ?? 0), other_bill: String(b.other_bill ?? 0), interest: b.interest != null ? String(b.interest) : '',
      issue_date: b.issue_date ?? '',
    })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.property_id) return
    const total = (Number(form.water_bill) || 0) + (Number(form.electric_bill) || 0) + (Number(form.gas_bill) || 0) + (Number(form.security_bill) || 0) + (Number(form.cusa) || 0) + (Number(form.other_bill) || 0)
    const body = {
      renter_id: form.renter_id ? parseInt(form.renter_id, 10) : null,
      property_id: parseInt(form.property_id, 10),
      month: form.month, issue_date: form.issue_date,
      water_bill: form.water_bill || 0, water_bill_due_from: form.water_bill_due_from || null, water_bill_due_to: form.water_bill_due_to || null,
      electric_bill: form.electric_bill || 0, electric_bill_due_from: form.electric_bill_due_from || null, electric_bill_due_to: form.electric_bill_due_to || null,
      gas_bill: form.gas_bill || 0, security_bill: form.security_bill || 0,
      cusa: form.cusa || 0, other_bill: form.other_bill || 0, interest: form.interest || 0,
      total_rent: total,
    }
    try {
      if (editing) {
        await fetch(`${API}/utility/${editing.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) })
      } else {
        await fetch(`${API}/utility`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) })
      }
      setShowModal(false)
      fetchBills()
    } catch { setError('Failed to save utility bill') }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this utility bill?')) return
    try { await fetch(`${API}/utility/${id}`, { method: 'DELETE', headers: authHeaders() }); fetchBills() }
    catch { setError('Failed to delete') }
  }
  const markPaid = async (id: number) => {
    try { await fetch(`${API}/utility/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ payment_status: 1 }) }); fetchBills() }
    catch { setError('Failed to update') }
  }

  const sf = (v: string, k: keyof typeof EMPTY_FORM) => setForm(f => ({ ...f, [k]: v }))

  return (
    <main className="af-db-main">
      <div className="af-db-topbar af-fade-in">
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Utility Bills</h1>
          <p className="af-db-subtitle">Water, electricity &amp; other billing per unit</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Export To Excel
          </button>
          <button onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Export To Pdf
          </button>
          <button className="af-btn-primary" onClick={openNew} style={{ cursor: 'pointer', border: 'none' }}>+ Add Bill</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total Bills', value: fmt(totalAll), sub: `${bills.length} records`, color: 'var(--accent)' },
          { label: `Paid (${paidCount})`, value: fmt(paidAmount), sub: 'Cleared', color: '#22c55e' },
          { label: `Unpaid (${unpaidCount})`, value: fmt(unpaidAmount), sub: 'Outstanding', color: '#ef4444' },
        ].map((s, i) => (
          <div key={s.label} className="af-stat-card af-fade-in" style={{ animationDelay: `${i * 0.05}s`, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: '20px 22px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 820, letterSpacing: '-0.03em', color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div className="af-tab-bar af-fade-in" style={{ animationDelay: '0.06s' }}>
        {(['all', 'unpaid', 'paid'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`af-tab-pill ${filter === f ? 'active' : ''}`}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading utility bills…</div>
      ) : (
        <div className="af-prop-table-wrap af-fade-in" style={{ overflowX: 'auto' }}>
          <table className="af-prop-table">
            <thead>
              <tr>
                <th>Renter</th><th>Property</th><th>Floor</th><th>Unit</th><th>Month</th>
                <th>Water Bill</th><th>Electric Bill</th><th>Cusa</th><th>Other</th><th>Total</th>
                <th>Interest</th><th>Status</th><th>Pay Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={14} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No bills found</td></tr>
              ) : pageItems.map((b, i) => (
                <tr key={b.id} className="af-row-in" style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}>
                  <td style={{ fontWeight: 650 }}>{b.renter_name?.trim() || '—'}</td>
                  <td style={{ fontSize: 13 }}>{b.property_name || '—'}</td>
                  <td style={{ fontSize: 13 }}>{b.floor_name || '—'}</td>
                  <td><span className="af-prop-badge type">{b.unit_name || '—'}</span></td>
                  <td style={{ fontSize: 13 }}>{b.month || '—'}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(b.water_bill)}
                    {(b.water_bill_due_from || b.water_bill_due_to) && (
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>{b.water_bill_due_from?.slice(0, 10) || '—'} → {b.water_bill_due_to?.slice(0, 10) || '—'}</div>
                    )}
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(b.electric_bill)}
                    {(b.electric_bill_due_from || b.electric_bill_due_to) && (
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>{b.electric_bill_due_from?.slice(0, 10) || '—'} → {b.electric_bill_due_to?.slice(0, 10) || '—'}</div>
                    )}
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(b.cusa)}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(b.other_bill)}</td>
                  <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(billTotal(b))}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{b.interest ? fmt(b.interest) : '—'}</td>
                  <td>
                    <span
                      onClick={() => b.payment_status !== 1 && markPaid(b.id)}
                      className={`af-status-pill ${b.payment_status !== 1 ? 'af-pulse' : ''}`}
                      style={{ background: b.payment_status === 1 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: b.payment_status === 1 ? '#22c55e' : '#ef4444', cursor: b.payment_status === 1 ? 'default' : 'pointer' }}
                      title={b.payment_status === 1 ? '' : 'Click to mark as paid'}
                    >
                      {b.payment_status === 1 ? 'paid' : 'unpaid'}
                    </span>
                  </td>
                  <td style={{ fontSize: 13 }}>{b.issue_date?.slice(0, 10) || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="af-prop-act edit" onClick={() => openEdit(b)}>Edit</button>
                      <button className="af-prop-act del" onClick={() => del(b.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />
        </div>
      )}

      {showModal && (
        <div className="af-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="af-modal af-modal-in" style={{ maxWidth: 560, maxHeight: '88vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">{editing ? 'Edit Utility Bill' : 'Add Utility Bill'}</h2>
            <div className="af-modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="af-field">
                  <label>Renter</label>
                  <select className="af-select" value={form.renter_id} onChange={e => sf(e.target.value, 'renter_id')}>
                    <option value="">-- Select Renter --</option>
                    {renters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div className="af-field">
                  <label>Property</label>
                  <select className="af-select" value={form.property_id} onChange={e => sf(e.target.value, 'property_id')}>
                    <option value="">-- Select Property --</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.property_name}</option>)}
                  </select>
                </div>
                <div className="af-field"><label>Month</label><input value={form.month} onChange={e => sf(e.target.value, 'month')} placeholder="June" /></div>
                <div className="af-field"><label>Issue Date</label><DatePicker value={form.issue_date} onChange={v => sf(v, 'issue_date')} /></div>
                <div className="af-field"><label>Water Bill</label><input type="number" min="0" value={form.water_bill} onChange={e => sf(e.target.value, 'water_bill')} placeholder="0" /></div>
                <div className="af-field"><label>Water Bill Due From</label><DatePicker value={form.water_bill_due_from} onChange={v => sf(v, 'water_bill_due_from')} /></div>
                <div className="af-field"><label>Water Bill Due To</label><DatePicker value={form.water_bill_due_to} onChange={v => sf(v, 'water_bill_due_to')} /></div>
                <div className="af-field"><label>Electric Bill</label><input type="number" min="0" value={form.electric_bill} onChange={e => sf(e.target.value, 'electric_bill')} placeholder="0" /></div>
                <div className="af-field"><label>Electric Bill Due From</label><DatePicker value={form.electric_bill_due_from} onChange={v => sf(v, 'electric_bill_due_from')} /></div>
                <div className="af-field"><label>Electric Bill Due To</label><DatePicker value={form.electric_bill_due_to} onChange={v => sf(v, 'electric_bill_due_to')} /></div>
                <div className="af-field"><label>Gas Bill</label><input type="number" min="0" value={form.gas_bill} onChange={e => sf(e.target.value, 'gas_bill')} placeholder="0" /></div>
                <div className="af-field"><label>Security Bill</label><input type="number" min="0" value={form.security_bill} onChange={e => sf(e.target.value, 'security_bill')} placeholder="0" /></div>
                <div className="af-field"><label>Cusa</label><input type="number" min="0" value={form.cusa} onChange={e => sf(e.target.value, 'cusa')} placeholder="0" /></div>
                <div className="af-field"><label>Other Bill</label><input type="number" min="0" value={form.other_bill} onChange={e => sf(e.target.value, 'other_bill')} placeholder="0" /></div>
                <div className="af-field"><label>Interest</label><input type="number" min="0" value={form.interest} onChange={e => sf(e.target.value, 'interest')} placeholder="0" /></div>
              </div>
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                Total: <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--accent)' }}>
                  {fmt((Number(form.water_bill) || 0) + (Number(form.electric_bill) || 0) + (Number(form.gas_bill) || 0) + (Number(form.security_bill) || 0) + (Number(form.cusa) || 0) + (Number(form.other_bill) || 0))}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save}>{editing ? 'Save changes' : 'Add bill'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
