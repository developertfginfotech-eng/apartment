'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import DatePicker from '@/components/DatePicker'
import Pagination, { usePagination } from '@/components/Pagination'
import { formatDate } from '@/lib/date'
import { computeFinalAmount } from '@/lib/leaseCalc'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Lease {
  id: number
  renter_id: number | null
  renter_name: string
  property_name: string | null
  floor_name: string | null
  units: string | null
  rent_amount: string | number
  rent_deposit: string | number | null
  start_date: string
  end_date: string | null
  lastbill_date: string | null
  status: number
  payment_status: 'Paid' | 'Pending'
}

interface LeaseFull {
  id: number
  renter_id: number
  property_id: number
  floor_id: string | null
  type: string | null
  amount: string | null
  maintenance: string | null
  tax: string | null
  wtax_applicable: string | null
  wtax: string | null
  rent_amount: string | null
  rent_deposit: string | null
  start_date: string | null
  end_date: string | null
  due_on: string | null
  document_image: string | null
  unit_ids: number[]
  deposits: { id: number; utility_type: number; utility: string }[]
  renter_name: string
  renter_type: string | null
  renter_email: string | null
  renter_contact: string | null
  renter_national_id: string | null
  renter_address: string | null
  property_name: string | null
  floor_name: string | null
}

type Bucket = 'all' | 'active' | 'expiring' | 'expired' | 'inactive'

const STA: Record<Exclude<Bucket, 'all'>, { bg: string; color: string; label: string }> = {
  active:   { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', label: 'Active' },
  expiring: { bg: 'rgba(249,115,22,0.12)', color: '#f97316', label: 'Expiring soon' },
  expired:  { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', label: 'Expired' },
  inactive: { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: 'Inactive' },
}

const EMPTY_LEASE_FORM = {
  renter_id: '', property_id: '', floor_id: '', unit_ids: [] as string[],
  type: 'Residential', amount: '', maintenance: '', tax: '', wtax_applicable: false, wtax: '',
  start_date: '', end_date: '', due_on: '1',
}
const EMPTY_DEPOSIT_FORM = { rent_deposit: '', deposits: [] as { utility_type: string; utility: string }[] }

const WIZARD_STEPS = ['Lease Info', 'Deposits'] as const
type WizardStep = typeof WIZARD_STEPS[number]

const VIEW_TABS = ['Info', 'Renter Details', 'Documents'] as const
type ViewTab = typeof VIEW_TABS[number]

export default function LeasesPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [leases, setLeases] = useState<Lease[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Bucket>('all')

  const [renters, setRenters] = useState<{ id: number; name: string }[]>([])
  const [properties, setProperties] = useState<{ id: number; property_name: string }[]>([])
  const [floors, setFloors] = useState<{ id: number; name: string }[]>([])
  const [units, setUnits] = useState<{ id: number; name: string }[]>([])
  const [taxes, setTaxes] = useState<{ id: number; key: string; value: string }[]>([])
  const [wtaxes, setWtaxes] = useState<{ id: number; key: string; value: string }[]>([])
  const [propertyUtilities, setPropertyUtilities] = useState<{ id: number; name: string; display_name: string }[]>([])

  // Create/Edit wizard
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<LeaseFull | null>(null)
  const [wizardStep, setWizardStep] = useState<WizardStep>('Lease Info')
  const [leaseForm, setLeaseForm] = useState(EMPTY_LEASE_FORM)
  const [depositForm, setDepositForm] = useState(EMPTY_DEPOSIT_FORM)
  const [existingDocs, setExistingDocs] = useState<string[]>([])
  const [newDocs, setNewDocs] = useState<File[]>([])
  const [saving, setSaving] = useState(false)

  // View
  const [viewing, setViewing] = useState<LeaseFull | null>(null)
  const [viewTab, setViewTab] = useState<ViewTab>('Info')

  // Escalation
  const [escalating, setEscalating] = useState<LeaseFull | null>(null)
  const [escalateForm, setEscalateForm] = useState({ amount: '', maintenance: '', tax: '', wtax_applicable: false, wtax: '', end_date: '' })
  const [escalateSaving, setEscalateSaving] = useState(false)
  const [escalateError, setEscalateError] = useState('')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const fetchLeases = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [activeRes, inactiveRes] = await Promise.all([
        fetch(`${API}/leases/summary?status=1`, { headers: authHeaders() }),
        fetch(`${API}/leases/summary?status=0`, { headers: authHeaders() }),
      ])
      const active = await activeRes.json()
      const inactive = await inactiveRes.json()
      setLeases([...(Array.isArray(active) ? active : []), ...(Array.isArray(inactive) ? inactive : [])])
    } catch { setError('Failed to load leases') }
    finally { setLoading(false) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchLeases() }, [fetchLeases])

  useEffect(() => {
    fetch(`${API}/renters`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setRenters(d)).catch(() => {})
    fetch(`${API}/properties`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setProperties(d)).catch(() => {})
    fetch(`${API}/tax`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setTaxes(d)).catch(() => {})
    fetch(`${API}/wtax`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setWtaxes(d)).catch(() => {})
    fetch(`${API}/property-utility`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setPropertyUtilities(d)).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFloors = useCallback(async (propertyId: string) => {
    if (!propertyId) { setFloors([]); return }
    const res = await fetch(`${API}/property-floor?property_id=${propertyId}`, { headers: authHeaders() })
    const d = await res.json()
    setFloors(Array.isArray(d) ? d : [])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUnits = useCallback(async (propertyId: string, floorId: string) => {
    if (!propertyId || !floorId) { setUnits([]); return }
    const res = await fetch(`${API}/property-unit?property_id=${propertyId}&floor_id=${floorId}`, { headers: authHeaders() })
    const d = await res.json()
    setUnits(Array.isArray(d) ? d : [])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const daysLeft = (end: string | null) => end ? Math.ceil((new Date(end).getTime() - Date.now()) / 86400000) : null

  const bucketOf = (l: Lease): Exclude<Bucket, 'all'> => {
    if (l.status === 0) return 'inactive'
    const days = daysLeft(l.end_date)
    if (days !== null && days <= 0) return 'expired'
    if (days !== null && days <= 60) return 'expiring'
    return 'active'
  }

  const buckets = useMemo(() => leases.map(l => ({ lease: l, bucket: bucketOf(l) })), [leases]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = filter === 'all' ? buckets : buckets.filter(b => b.bucket === filter)
  const { page, setPage, pageSize, pageItems } = usePagination(filtered, 10)
  const activeCount = buckets.filter(b => b.bucket === 'active').length
  const expiringCount = buckets.filter(b => b.bucket === 'expiring').length

  const fmt = (v: string | number | null) => `₱ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const exportHeaders = ['#', 'Renter Name', 'Property Name', 'Floor', 'Units', 'Rent Amount', 'Start Date', 'End Date', 'Payment Status', 'Last Billing', 'Status']
  const exportRows = () => filtered.map(({ lease: l, bucket }, i) => [
    i + 1, l.renter_name?.trim() || '—', l.property_name || '—', l.floor_name || '—', l.units || '—',
    fmt(l.rent_amount), formatDate(l.start_date), formatDate(l.end_date),
    l.payment_status, formatDate(l.lastbill_date), STA[bucket].label,
  ])
  const exportExcel = () => {
    const csv = [exportHeaders, ...exportRows()].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'leases.csv' })
    a.click()
  }
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Leases List', 14, 14)
    autoTable(doc, {
      head: [exportHeaders],
      body: exportRows().map(r => r.map(String)),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    })
    doc.save('leases.pdf')
  }

  const finalAmount = computeFinalAmount({
    amount: leaseForm.amount, maintenance: leaseForm.maintenance, tax: leaseForm.tax,
    wtaxApplicable: leaseForm.wtax_applicable, wtax: leaseForm.wtax,
  })

  const openCreate = () => {
    setEditTarget(null)
    setWizardStep('Lease Info')
    setLeaseForm(EMPTY_LEASE_FORM)
    setDepositForm(EMPTY_DEPOSIT_FORM)
    setExistingDocs([])
    setNewDocs([])
    setFloors([]); setUnits([])
    setShowForm(true)
  }

  const openEdit = async (l: Lease) => {
    setError('')
    try {
      const res = await fetch(`${API}/leases/${l.id}/full`, { headers: authHeaders() })
      const full: LeaseFull = await res.json()
      setEditTarget(full)
      setWizardStep('Lease Info')
      setLeaseForm({
        renter_id: String(full.renter_id ?? ''),
        property_id: String(full.property_id ?? ''),
        floor_id: full.floor_id ?? '',
        unit_ids: (full.unit_ids ?? []).map(String),
        type: full.type ?? 'Residential',
        amount: full.amount ?? '',
        maintenance: full.maintenance ?? '',
        tax: full.tax ?? '',
        wtax_applicable: full.wtax_applicable === 'on',
        wtax: full.wtax ?? '',
        start_date: full.start_date?.slice(0, 10) ?? '',
        end_date: full.end_date?.slice(0, 10) ?? '',
        due_on: full.due_on ?? '1',
      })
      setDepositForm({
        rent_deposit: full.rent_deposit ?? '',
        deposits: (full.deposits ?? []).map(d => ({ utility_type: String(d.utility_type), utility: d.utility })),
      })
      setExistingDocs(full.document_image ? full.document_image.split(',').filter(Boolean) : [])
      setNewDocs([])
      await fetchFloors(String(full.property_id ?? ''))
      await fetchUnits(String(full.property_id ?? ''), full.floor_id ?? '')
      setShowForm(true)
    } catch { setError('Failed to load lease') }
  }

  const closeForm = () => {
    setShowForm(false)
    setEditTarget(null)
    setLeaseForm(EMPTY_LEASE_FORM)
    setDepositForm(EMPTY_DEPOSIT_FORM)
    setExistingDocs([])
    setNewDocs([])
  }

  const onPropertyChange = (propertyId: string) => {
    setLeaseForm(f => ({ ...f, property_id: propertyId, floor_id: '', unit_ids: [] }))
    setUnits([])
    fetchFloors(propertyId)
  }
  const onFloorChange = (floorId: string) => {
    setLeaseForm(f => ({ ...f, floor_id: floorId, unit_ids: [] }))
    fetchUnits(leaseForm.property_id, floorId)
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

  const save = async () => {
    if (!editTarget && (!leaseForm.renter_id || !leaseForm.property_id)) return
    if (!leaseForm.amount || !leaseForm.start_date || !leaseForm.end_date) return
    setSaving(true); setError('')
    try {
      const uploadedUrls: string[] = []
      for (const file of newDocs) {
        const url = await uploadFile(file)
        if (url) uploadedUrls.push(url)
      }
      const documentImage = [...existingDocs, ...uploadedUrls].join(',') || null

      const url = editTarget ? `${API}/leases/${editTarget.id}` : `${API}/leases`
      const method = editTarget ? 'PUT' : 'POST'
      const body: Record<string, unknown> = {
        floor_id: leaseForm.floor_id || null,
        type: leaseForm.type,
        amount: leaseForm.amount,
        maintenance: leaseForm.maintenance || '0',
        tax: leaseForm.tax || null,
        wtax_applicable: leaseForm.wtax_applicable ? 'on' : '',
        wtax: leaseForm.wtax_applicable ? leaseForm.wtax : null,
        rent_amount: finalAmount,
        start_date: leaseForm.start_date,
        end_date: leaseForm.end_date,
        due_on: leaseForm.due_on,
        document_image: documentImage,
        rent_deposit: depositForm.rent_deposit || 0,
        unit_ids: leaseForm.unit_ids.map(Number),
        deposits: depositForm.deposits.filter(d => d.utility_type && d.utility).map(d => ({ utility_type: Number(d.utility_type), utility: d.utility })),
      }
      if (!editTarget) {
        body.renter_id = parseInt(leaseForm.renter_id, 10)
        body.property_id = parseInt(leaseForm.property_id, 10)
        body.status = 1
      } else {
        body.property_id = parseInt(leaseForm.property_id, 10)
      }
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      closeForm()
      fetchLeases()
    } catch { setError(editTarget ? 'Failed to update lease' : 'Failed to create lease') }
    finally { setSaving(false) }
  }

  const deleteLease = async (id: number) => {
    if (!confirm('Delete this lease?')) return
    try {
      await fetch(`${API}/leases/${id}`, { method: 'DELETE', headers: authHeaders() })
      fetchLeases()
    } catch { setError('Failed to delete lease') }
  }

  const openView = async (l: Lease) => {
    setError('')
    try {
      const res = await fetch(`${API}/leases/${l.id}/full`, { headers: authHeaders() })
      const full: LeaseFull = await res.json()
      setViewTab('Info')
      setViewing(full)
    } catch { setError('Failed to load lease') }
  }

  const openEscalate = async (l: Lease) => {
    setError(''); setEscalateError('')
    try {
      const res = await fetch(`${API}/leases/${l.id}/full`, { headers: authHeaders() })
      const full: LeaseFull = await res.json()
      setEscalating(full)
      setEscalateForm({
        amount: full.amount ?? '',
        maintenance: full.maintenance ?? '',
        tax: full.tax ?? '',
        wtax_applicable: full.wtax_applicable === 'on',
        wtax: full.wtax ?? '',
        end_date: '',
      })
    } catch { setError('Failed to load lease') }
  }

  const escalateFinalAmount = computeFinalAmount({
    amount: escalateForm.amount, maintenance: escalateForm.maintenance, tax: escalateForm.tax,
    wtaxApplicable: escalateForm.wtax_applicable, wtax: escalateForm.wtax,
  })

  const saveEscalation = async () => {
    if (!escalating || !escalateForm.amount || !escalateForm.end_date) return
    setEscalateSaving(true); setEscalateError('')
    try {
      const res = await fetch(`${API}/leases/${escalating.id}/escalate`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          amount: escalateForm.amount,
          maintenance: escalateForm.maintenance || '0',
          tax: escalateForm.tax || null,
          wtax_applicable: escalateForm.wtax_applicable ? 'on' : '',
          wtax: escalateForm.wtax_applicable ? escalateForm.wtax : null,
          rent_amount: escalateFinalAmount,
          end_date: escalateForm.end_date,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || 'Failed to escalate lease')
      }
      setEscalating(null)
      fetchLeases()
    } catch (err) { setEscalateError(err instanceof Error ? err.message : 'Failed to escalate lease') }
    finally { setEscalateSaving(false) }
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar af-fade-in">
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Leases</h1>
          <p className="af-db-subtitle">{activeCount} active · {expiringCount} expiring soon</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Export To Excel
          </button>
          <button onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Export To Pdf
          </button>
          <button className="af-btn-primary" onClick={openCreate} style={{ cursor: 'pointer', border: 'none' }}>+ New Lease</button>
        </div>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div className="af-tab-bar af-fade-in" style={{ animationDelay: '0.06s' }}>
        {(['all', 'active', 'expiring', 'expired', 'inactive'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`af-tab-pill ${filter === s ? 'active' : ''}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading leases…</div>
      ) : (
        <div className="af-prop-table-wrap af-fade-in" style={{ animationDelay: '0.1s' }}>
          <table className="af-prop-table">
            <thead>
              <tr>
                <th>Renter Name</th><th>Property Name</th><th>Floor</th><th>Units</th>
                <th>Rent Amount</th><th>Start Date</th><th>End Date</th>
                <th>Payment Status</th><th>Last Billing</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>No leases found</td></tr>
              ) : pageItems.map(({ lease: l, bucket }, i) => (
                <tr key={l.id} className="af-row-in" style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}>
                  <td style={{ fontWeight: 650 }}>{l.renter_name?.trim() || '—'}</td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>{l.property_name || '—'}</td>
                  <td style={{ fontSize: 13 }}>{l.floor_name || '—'}</td>
                  <td><span className="af-prop-badge type">{l.units || '—'}</span></td>
                  <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(l.rent_amount)}</td>
                  <td style={{ fontSize: 12.5 }}>{formatDate(l.start_date)}</td>
                  <td style={{ fontSize: 12.5 }}>{formatDate(l.end_date)}</td>
                  <td>
                    <span className={`af-status-pill ${l.payment_status === 'Pending' ? 'af-pulse' : ''}`} style={{ background: l.payment_status === 'Paid' ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.12)', color: l.payment_status === 'Paid' ? '#22c55e' : '#f97316' }}>
                      {l.payment_status}
                    </span>
                  </td>
                  <td style={{ fontSize: 12.5 }}>{formatDate(l.lastbill_date)}</td>
                  <td><span className="af-status-pill" style={{ background: STA[bucket].bg, color: STA[bucket].color }}>{STA[bucket].label}</span></td>
                  <td>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, width: 52 }}>
                      <button title="View" onClick={() => openView(l)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>👁</button>
                      <button title="Edit" onClick={() => openEdit(l)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                      <button title="Rent Escalation" onClick={() => openEscalate(l)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>🏠</button>
                      <button title="Delete" onClick={() => deleteLease(l.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />
        </div>
      )}

      {/* Create / Edit wizard */}
      {showForm && (
        <div className="af-modal-overlay" onClick={closeForm}>
          <div className="af-modal af-modal-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 760, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="af-modal-title">{editTarget ? 'Edit Lease' : 'New Lease'}</h2>
            <div className="af-tab-bar" style={{ marginBottom: 18 }}>
              {WIZARD_STEPS.map(s => (
                <button key={s} onClick={() => setWizardStep(s)} className={`af-tab-pill ${wizardStep === s ? 'active' : ''}`}>{s}</button>
              ))}
            </div>

            {wizardStep === 'Lease Info' && (
              <div className="af-modal-form">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="af-field">
                    <label>Renter</label>
                    <select className="af-select" value={leaseForm.renter_id} onChange={e => setLeaseForm(f => ({ ...f, renter_id: e.target.value }))} disabled={!!editTarget}>
                      <option value="">-- Select Renter --</option>
                      {renters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div className="af-field">
                    <label>Property</label>
                    <select className="af-select" value={leaseForm.property_id} onChange={e => onPropertyChange(e.target.value)}>
                      <option value="">-- Select Property --</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.property_name}</option>)}
                    </select>
                  </div>
                  <div className="af-field">
                    <label>Floor</label>
                    <select className="af-select" value={leaseForm.floor_id} onChange={e => onFloorChange(e.target.value)}>
                      <option value="">-- Select Floor --</option>
                      {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div className="af-field">
                    <label>Unit(s)</label>
                    <select className="af-select" multiple value={leaseForm.unit_ids} style={{ height: 84 }}
                      onChange={e => setLeaseForm(f => ({ ...f, unit_ids: Array.from(e.target.selectedOptions, o => o.value) }))}>
                      {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="af-field">
                    <label>Type</label>
                    <select className="af-select" value={leaseForm.type} onChange={e => setLeaseForm(f => ({ ...f, type: e.target.value }))}>
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                    </select>
                  </div>
                  <div className="af-field"><label>Rent Amount</label><input type="number" min="0" step="0.01" value={leaseForm.amount} onChange={e => setLeaseForm(f => ({ ...f, amount: e.target.value }))} placeholder="10000"/></div>
                  <div className="af-field"><label>Maintenance</label><input type="number" min="0" step="0.01" value={leaseForm.maintenance} onChange={e => setLeaseForm(f => ({ ...f, maintenance: e.target.value }))} placeholder="0"/></div>
                  <div className="af-field">
                    <label>VAT (%)</label>
                    <select className="af-select" value={leaseForm.tax} onChange={e => setLeaseForm(f => ({ ...f, tax: e.target.value }))}>
                      <option value="">-- Select VAT --</option>
                      {taxes.map(t => <option key={t.id} value={t.value}>{t.key} ({t.value}%)</option>)}
                    </select>
                  </div>
                  <div className="af-field">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={leaseForm.wtax_applicable} onChange={e => setLeaseForm(f => ({ ...f, wtax_applicable: e.target.checked }))} />
                      Wtax Applicable
                    </label>
                    {leaseForm.wtax_applicable && (
                      <select className="af-select" value={leaseForm.wtax} onChange={e => setLeaseForm(f => ({ ...f, wtax: e.target.value }))}>
                        <option value="">-- Select WTAX --</option>
                        {wtaxes.map(w => <option key={w.id} value={w.value}>{w.key} ({w.value}%)</option>)}
                      </select>
                    )}
                  </div>
                  <div className="af-field"><label>Final Amount</label><input readOnly value={finalAmount} style={{ opacity: 0.75 }}/></div>
                  <div className="af-field"><label>Start Date</label><DatePicker value={leaseForm.start_date} onChange={v => setLeaseForm(f => ({ ...f, start_date: v }))}/></div>
                  <div className="af-field"><label>End Date</label><DatePicker value={leaseForm.end_date} onChange={v => setLeaseForm(f => ({ ...f, end_date: v }))}/></div>
                  <div className="af-field">
                    <label>Due On (Day of Month)</label>
                    <select className="af-select" value={leaseForm.due_on} onChange={e => setLeaseForm(f => ({ ...f, due_on: e.target.value }))}>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="af-field" style={{ gridColumn: 'span 2' }}>
                    <label>Agreement Document</label>
                    <input type="file" multiple onChange={e => setNewDocs(Array.from(e.target.files ?? []))} />
                    {existingDocs.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                        {existingDocs.map((d, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)', borderRadius: 8, padding: '6px 10px', fontSize: 12.5 }}>
                            <a href={`${API}${d}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{d.split('/').pop()}</a>
                            <button onClick={() => setExistingDocs(docs => docs.filter((_, di) => di !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 'Deposits' && (
              <div className="af-modal-form">
                <div className="af-field"><label>Rent Deposit Amount</label><input type="number" min="0" step="0.01" value={depositForm.rent_deposit} onChange={e => setDepositForm(f => ({ ...f, rent_deposit: e.target.value }))} placeholder="20000"/></div>
                <div style={{ marginTop: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Utility Deposits</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    {depositForm.deposits.map((d, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8 }}>
                        <select className="af-select" value={d.utility_type} style={{ flex: '1 1 auto' }}
                          onChange={e => setDepositForm(f => ({ ...f, deposits: f.deposits.map((x, xi) => xi === i ? { ...x, utility_type: e.target.value } : x) }))}>
                          <option value="">-- Utility Type --</option>
                          {propertyUtilities.map(u => <option key={u.id} value={u.id}>{u.display_name || u.name}</option>)}
                        </select>
                        <input type="number" min="0" step="0.01" placeholder="Amount" value={d.utility} style={{ flex: '0 0 140px' }}
                          onChange={e => setDepositForm(f => ({ ...f, deposits: f.deposits.map((x, xi) => xi === i ? { ...x, utility: e.target.value } : x) }))} />
                        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setDepositForm(f => ({ ...f, deposits: f.deposits.filter((_, xi) => xi !== i) }))}>Remove</button>
                      </div>
                    ))}
                    <button className="af-btn-secondary" style={{ cursor: 'pointer', alignSelf: 'flex-start' }}
                      onClick={() => setDepositForm(f => ({ ...f, deposits: [...f.deposits, { utility_type: '', utility: '' }] }))}>+ Add More</button>
                  </div>
                </div>
              </div>
            )}

            {error && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 12 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={closeForm} disabled={saving}>Cancel</button>
              <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save} disabled={saving}>
                {saving ? 'Saving…' : editTarget ? 'Update' : 'Create lease'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View */}
      {viewing && (
        <div className="af-modal-overlay" onClick={() => setViewing(null)}>
          <div className="af-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 650, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="af-modal-title">Lease Details</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: -14, marginBottom: 16 }}>{viewing.renter_name?.trim()}</p>

            <div className="af-tab-bar" style={{ marginBottom: 18 }}>
              {VIEW_TABS.map(t => (
                <button key={t} onClick={() => setViewTab(t)} className={`af-tab-pill ${viewTab === t ? 'active' : ''}`}>{t}</button>
              ))}
            </div>

            {viewTab === 'Info' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {([
                  ['Type', viewing.type || '—'],
                  ['Renter', viewing.renter_name?.trim() || '—'],
                  ['Property', viewing.property_name || '—'],
                  ['Floor', viewing.floor_name || '—'],
                  ['Unit(s)', viewing.unit_ids?.join(', ') || '—'],
                  ['Start Date', formatDate(viewing.start_date)],
                  ['End Date', formatDate(viewing.end_date)],
                  ['Rent Amount', fmt(viewing.amount)],
                  ['Total Rent (incl. VAT)', fmt(viewing.rent_amount)],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
            )}

            {viewTab === 'Renter Details' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {([
                  ['Name', viewing.renter_name?.trim() || '—'],
                  ['Type', viewing.renter_type ?? 'individual'],
                  ['Email', viewing.renter_email || '—'],
                  ['Contact', viewing.renter_contact || '—'],
                  ['National ID', viewing.renter_national_id || '—'],
                  ['Address', viewing.renter_address || '—'],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
            )}

            {viewTab === 'Documents' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {!viewing.document_image ? (
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>No documents uploaded</div>
                ) : viewing.document_image.split(',').filter(Boolean).map((d, i) => (
                  <a key={i} href={`${API}${d}`} target="_blank" rel="noreferrer"
                    style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--accent)' }}>
                    {d.split('/').pop()}
                  </a>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Rent Escalation */}
      {escalating && (
        <div className="af-modal-overlay" onClick={() => setEscalating(null)}>
          <div className="af-modal af-modal-in" onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">Lease Rent Escalation</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: -14, marginBottom: 16 }}>{escalating.renter_name?.trim()}</p>
            <div className="af-modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="af-field"><label>Renter</label><input value={escalating.renter_name?.trim() ?? ''} disabled/></div>
                <div className="af-field"><label>Property</label><input value={escalating.property_name ?? ''} disabled/></div>
                <div className="af-field"><label>Floor</label><input value={escalating.floor_name ?? ''} disabled/></div>
                <div className="af-field"><label>Unit(s)</label><input value={escalating.unit_ids?.join(', ') ?? ''} disabled/></div>
                <div className="af-field"><label>Rent Amount</label><input type="number" min="0" step="0.01" value={escalateForm.amount} onChange={e => setEscalateForm(f => ({ ...f, amount: e.target.value }))}/></div>
                <div className="af-field"><label>Maintenance</label><input type="number" min="0" step="0.01" value={escalateForm.maintenance} onChange={e => setEscalateForm(f => ({ ...f, maintenance: e.target.value }))}/></div>
                <div className="af-field">
                  <label>VAT (%)</label>
                  <select className="af-select" value={escalateForm.tax} onChange={e => setEscalateForm(f => ({ ...f, tax: e.target.value }))}>
                    <option value="">-- Select VAT --</option>
                    {taxes.map(t => <option key={t.id} value={t.value}>{t.key} ({t.value}%)</option>)}
                  </select>
                </div>
                <div className="af-field">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={escalateForm.wtax_applicable} onChange={e => setEscalateForm(f => ({ ...f, wtax_applicable: e.target.checked }))} />
                    Wtax Applicable
                  </label>
                  {escalateForm.wtax_applicable && (
                    <select className="af-select" value={escalateForm.wtax} onChange={e => setEscalateForm(f => ({ ...f, wtax: e.target.value }))}>
                      <option value="">-- Select WTAX --</option>
                      {wtaxes.map(w => <option key={w.id} value={w.value}>{w.key} ({w.value}%)</option>)}
                    </select>
                  )}
                </div>
                <div className="af-field"><label>Final Amount</label><input readOnly value={escalateFinalAmount} style={{ opacity: 0.75 }}/></div>
                <div className="af-field"><label>When to start</label><DatePicker value={escalateForm.end_date} onChange={v => setEscalateForm(f => ({ ...f, end_date: v }))}/></div>
              </div>
              {escalateError && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 10 }}>{escalateError}</div>}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setEscalating(null)} disabled={escalateSaving}>Cancel</button>
              <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={saveEscalation} disabled={escalateSaving}>
                {escalateSaving ? 'Saving…' : 'Escalate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
