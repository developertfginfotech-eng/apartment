'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Pagination, { usePagination } from '@/components/Pagination'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Maintenance {
  id: number
  property_id: number
  property_name: string
  type_id: number
  type_name: string
  title: string
  amount: number
  date: string
  description: string
  status: number
  maintenance_by: string | null
  maintenances_status: number
  reject_details: string | null
  payment_status: number
  payment_type: string | null
  receipt_image: string | null
}

interface MaintenanceType { id: number; name: string }

const STATUS_STYLE: Record<number, { bg: string; color: string; label: string }> = {
  1: { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', label: 'Active' },
  0: { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: 'Inactive' },
}

const REQUESTED_BY: Record<string, string> = { '0': 'Owner', '1': 'Renter', '2': 'Admin', '3': 'Maintenance' }

const MAINTENANCE_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Under Process', color: '#f97316' },
  1: { label: 'Open', color: '#3b82f6' },
  2: { label: 'Completed', color: '#22c55e' },
  3: { label: 'Rejected', color: '#ef4444' },
}

const PAYMENT_TYPES = ['Cash', 'Cheque', 'Pdc Cheque', 'Online']

const EMPTY_FORM = {
  type: '',
  title: '',
  amount: '',
  date: '',
  description: '',
  property_id: '',
}

export default function MaintenancePage() {
  const router = useRouter()

  const [records, setRecords]     = useState<Maintenance[]>([])
  const [types, setTypes]         = useState<MaintenanceType[]>([])
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState<Maintenance | null>(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const [viewing, setViewing] = useState<Maintenance | null>(null)

  const [collecting, setCollecting] = useState<Maintenance | null>(null)
  const [collectForm, setCollectForm] = useState({
    payment_type: '', cheque_details: '', cheque_image: null as File | null,
    online_details: '', online_image: null as File | null,
    pdc_cheque_details: '', pdc_cheque_image: null as File | null, pdc_cheque_date: '',
    receipt_image: null as File | null,
  })
  const [collectSaving, setCollectSaving] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('apt_token')) router.push('/login')
  }, [router])

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`${API}/maintenance?${params}`, { headers: authHeaders() })
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      const data = await res.json()
      setRecords(Array.isArray(data) ? data : data.data ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load maintenance records')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  useEffect(() => {
    fetch(`${API}/maintenance-type`, { headers: authHeaders() })
      .then(r => r.json()).then(d => Array.isArray(d) && setTypes(d)).catch(()=>{})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (v: string | number) => `₱ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const { page, setPage, pageSize, pageItems } = usePagination(records, 10)

  const exportHeaders = ['#', 'Maintenance Title', 'Property', 'Date', 'Amount', 'Details', 'Requested By', 'Maintenances Status', 'Payment Status', 'Status']
  const exportRows = () => records.map((r, i) => [
    i + 1, r.title, r.property_name ?? String(r.property_id), r.date ? r.date.slice(0, 10) : '—',
    fmt(r.amount), r.description || '—', REQUESTED_BY[r.maintenance_by ?? ''] ?? '—',
    MAINTENANCE_STATUS[r.maintenances_status]?.label ?? '—', r.payment_status === 1 ? 'Paid' : 'Pending',
    r.status === 1 ? 'Active' : 'Inactive',
  ])

  const exportExcel = () => {
    const csv = [exportHeaders, ...exportRows()].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'maintenances.csv' })
    a.click()
  }

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Maintenances List', 14, 14)
    autoTable(doc, {
      head: [exportHeaders],
      body: exportRows().map(r => r.map(String)),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    })
    doc.save('maintenances.pdf')
  }

  const openCreate = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (r: Maintenance) => {
    setEditTarget(r)
    setForm({
      type: String(r.type_id ?? ''),
      title: r.title,
      amount: String(r.amount),
      date: r.date ? r.date.slice(0, 10) : '',
      description: r.description ?? '',
      property_id: String(r.property_id),
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditTarget(null)
    setForm(EMPTY_FORM)
  }

  const saveRecord = async () => {
    if (!form.title || !form.property_id || !form.date) return
    setSaving(true)
    setError('')
    try {
      const dateObj = new Date(form.date)
      const body = {
        type: form.type ? parseInt(form.type, 10) : null,
        title: form.title,
        amount: parseFloat(form.amount) || 0,
        date: form.date,
        month: dateObj.getMonth() + 1,
        year: dateObj.getFullYear(),
        description: form.description,
        property_id: parseInt(form.property_id, 10),
        status: 1,
      }

      const url = editTarget
        ? `${API}/maintenance/${editTarget.id}`
        : `${API}/maintenance`
      const method = editTarget ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      closeForm()
      await fetchRecords()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save record')
    } finally {
      setSaving(false)
    }
  }

  const deleteRecord = async (id: number) => {
    if (!confirm('Delete this maintenance record?')) return
    setError('')
    try {
      const res = await fetch(`${API}/maintenance/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
      await fetchRecords()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete record')
    }
  }

  const changeMaintenanceStatus = async (r: Maintenance, status: number) => {
    if (status === 2 && !r.amount) { alert('Please add maintenance amount first!'); return }
    if (status === 3) {
      const reject_details = window.prompt('Rejected Reasons')
      if (reject_details === null) return
      await fetch(`${API}/maintenance/${r.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ maintenances_status: 3, reject_details }) })
      fetchRecords()
      return
    }
    const label = MAINTENANCE_STATUS[status]?.label ?? ''
    if (!confirm(`Are you sure you want to ${label} this?`)) return
    await fetch(`${API}/maintenance/${r.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ maintenances_status: status }) })
    fetchRecords()
  }

  const confirmPdcCheque = async (r: Maintenance) => {
    await fetch(`${API}/maintenance/${r.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ payment_status: 1 }) })
    fetchRecords()
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

  const openCollect = (r: Maintenance) => {
    setCollecting(r)
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
      const body: Record<string, unknown> = {
        payment_type: collectForm.payment_type,
        payment_status: collectForm.payment_type === 'Pdc Cheque' ? 0 : 1,
      }
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
      await fetch(`${API}/maintenance/${collecting.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) })
      closeCollect()
      fetchRecords()
    } catch { setError('Failed to collect payment') }
    finally { setCollectSaving(false) }
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Maintenance</h1>
          <p className="af-db-subtitle">
            {loading ? 'Loading…' : `${records.filter(r => r.status === 1).length} active record${records.filter(r => r.status === 1).length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Export To Excel
          </button>
          <button onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Export To Pdf
          </button>
          <button className="af-btn-primary" onClick={openCreate} style={{ cursor: 'pointer', border: 'none' }}>
            + New Record
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, property, type…"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', width: 260 }}/>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 18, color: '#ef4444', fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
          Loading maintenance records…
        </div>
      ) : records.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
          No maintenance records found.
        </div>
      ) : (
        <div className="af-prop-table-wrap" style={{ overflowX: 'auto' }}>
          <table className="af-prop-table" style={{ minWidth: 1400 }}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Property</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Details</th>
                <th>Requested By</th>
                <th>Maintenances Status</th>
                <th>Payment Status</th>
                <th>Status</th>
                <th>Action</th>
                <th>Pay Now</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(r => {
                const st = STATUS_STYLE[r.status] ?? STATUS_STYLE[0]
                const ms = MAINTENANCE_STATUS[r.maintenances_status] ?? MAINTENANCE_STATUS[0]
                const editableStatus = r.maintenances_status !== 2 && r.maintenances_status !== 3
                const showPayNow = r.payment_status === 0 && !!r.amount && r.maintenances_status === 2
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 650 }}>{r.title}</td>
                    <td>{r.type_name ?? '—'}</td>
                    <td>{r.property_name ?? r.property_id}</td>
                    <td style={{ fontSize: 13 }}>{r.date ? r.date.slice(0, 10) : '—'}</td>
                    <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      ₱ {Number(r.amount).toLocaleString()}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 200 }}>{r.description || '—'}</td>
                    <td style={{ fontSize: 13 }}>{REQUESTED_BY[r.maintenance_by ?? ''] ?? '—'}</td>
                    <td>
                      {editableStatus ? (
                        <select
                          className="af-select"
                          style={{ fontSize: 12, padding: '4px 8px' }}
                          value={r.maintenances_status}
                          onChange={e => changeMaintenanceStatus(r, Number(e.target.value))}
                        >
                          <option value={0}>Under Process</option>
                          <option value={1}>Open</option>
                          <option value={2}>Completed</option>
                          <option value={3}>Rejected</option>
                        </select>
                      ) : r.maintenances_status === 3 ? (
                        <a role="button" onClick={() => setViewing(r)} style={{ color: ms.color, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Rejected</a>
                      ) : (
                        <span style={{ color: ms.color, fontSize: 12, fontWeight: 600 }}>{ms.label}</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100, background: r.payment_status === 1 ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.12)', color: r.payment_status === 1 ? '#22c55e' : '#f97316' }}>
                        {r.payment_status === 1 ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100, background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="af-prop-act edit" onClick={() => setViewing(r)}>View</button>
                      <button className="af-prop-act edit" onClick={() => openEdit(r)}>Edit</button>
                      <button className="af-prop-act delete" onClick={() => deleteRecord(r.id)}>Delete</button>
                    </td>
                    <td>
                      {showPayNow
                        ? (r.payment_type === 'Pdc Cheque'
                            ? <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none', padding: '6px 14px', fontSize: 12 }} onClick={() => confirmPdcCheque(r)}>Confirm</button>
                            : <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none', padding: '6px 14px', fontSize: 12 }} onClick={() => openCollect(r)}>Pay Now</button>)
                        : r.payment_status === 1
                          ? (r.receipt_image
                              ? <a href={`${API}${r.receipt_image}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)' }}>Receipt</a>
                              : <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>)
                          : <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <Pagination page={page} pageSize={pageSize} totalItems={records.length} onPageChange={setPage} />
        </div>
      )}

      {showForm && (
        <div className="af-modal-overlay" onClick={closeForm}>
          <div className="af-modal" onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">{editTarget ? 'Edit Maintenance Record' : 'New Maintenance Record'}</h2>
            <div className="af-modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="af-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Title</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Replace kitchen faucet"
                  />
                </div>
                <div className="af-field">
                  <label>Type</label>
                  <select className="af-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="">-- Select Type --</option>
                    {types.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="af-field">
                  <label>Property ID</label>
                  <input
                    type="number"
                    value={form.property_id}
                    onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
                    placeholder="1"
                  />
                </div>
                <div className="af-field">
                  <label>Amount</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="af-field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div className="af-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Description</label>
                  <input
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Optional details…"
                  />
                </div>
              </div>
            </div>
            {error && (
              <div style={{ color: '#ef4444', fontSize: 12.5, marginTop: 10 }}>{error}</div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={closeForm} disabled={saving}>
                Cancel
              </button>
              <button
                className="af-auth-submit"
                style={{ width: 'auto', padding: '10px 24px', opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
                onClick={saveRecord}
                disabled={saving}
              >
                {saving ? 'Saving…' : editTarget ? 'Save changes' : 'Create record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details */}
      {viewing && (
        <div className="af-modal-overlay" onClick={() => setViewing(null)}>
          <div className="af-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">Maintenance Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {([
                ['Title', viewing.title],
                ['Type', viewing.type_name ?? '—'],
                ['Property', viewing.property_name ?? String(viewing.property_id)],
                ['Date', viewing.date ? viewing.date.slice(0, 10) : '—'],
                ['Amount', fmt(viewing.amount)],
                ['Requested By', REQUESTED_BY[viewing.maintenance_by ?? ''] ?? '—'],
                ['Maintenances Status', MAINTENANCE_STATUS[viewing.maintenances_status]?.label ?? '—'],
                ['Payment Status', viewing.payment_status === 1 ? 'Paid' : 'Pending'],
                ['Payment Type', viewing.payment_type || '—'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
                </div>
              ))}
              <div style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px', gridColumn: '1/-1' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Details</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{viewing.description || '—'}</div>
              </div>
              {viewing.maintenances_status === 3 && (
                <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: 9, padding: '10px 14px', gridColumn: '1/-1' }}>
                  <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Rejected Reason</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{viewing.reject_details || '—'}</div>
                </div>
              )}
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

      {/* Maintenance Collect */}
      {collecting && (
        <div className="af-modal-overlay" onClick={closeCollect}>
          <div className="af-modal" onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">Maintenance Collect</h2>
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
                    <input type="date" value={collectForm.pdc_cheque_date} onChange={e => setCollectForm(f => ({ ...f, pdc_cheque_date: e.target.value }))} />
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
                  <label>Total Maintenance</label>
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
