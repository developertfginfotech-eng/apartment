'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Pagination, { usePagination } from '@/components/Pagination'
import FileDropInput from '@/components/FileDropInput'
import ToggleSwitch from '@/components/ToggleSwitch'
import { formatDate } from '@/lib/date'

interface Renter {
  id: number
  property_id: number
  property_name: string | null
  floor_name: string | null
  on_rent: string | null
  lease_start_date: string | null
  lease_end_date: string | null
  first_name: string
  middle_name: string | null
  last_name: string | null
  name: string
  renter_type: string | null
  company_type: string | null
  email: string
  contact: string
  national_id: string
  advance_rent: string
  rent_per_month: string
  issue_date: string
  address: string
  renter_status: number
  status: number
}

interface Doc { id: number; document_type: number; document: string; document_type_name: string }
interface DocType { id: number; name: string }

type FormState = {
  property_id: string
  renter_type: string
  first_name: string
  middle_name: string
  last_name: string
  company_type: string
  email: string
  contact: string
  national_id: string
  rent_per_month: string
  advance_rent: string
  issue_date: string
  address: string
  renter_status: string
}

const EMPTY_FORM: FormState = {
  property_id: '',
  renter_type: 'individual',
  first_name: '',
  middle_name: '',
  last_name: '',
  company_type: '',
  email: '',
  contact: '',
  national_id: '',
  rent_per_month: '',
  advance_rent: '',
  issue_date: '',
  address: '',
  renter_status: '1',
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
})

const STATUS_LABEL: Record<number, string> = {
  1: 'active',
  0: 'expired',
}

const VIEW_TABS = ['Info', 'Documents'] as const
type ViewTab = typeof VIEW_TABS[number]

export default function TenantsPage() {
  const router = useRouter()
  const [renters, setRenters]     = useState<Renter[]>([])
  const [docTypes, setDocTypes]   = useState<DocType[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState<'all' | 'active' | 'inactive'>('all')
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<Renter | null>(null)
  const [form, setForm]           = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const [docs, setDocs]             = useState<Doc[]>([])
  const [newDocType, setNewDocType] = useState('')
  const [newDocFile, setNewDocFile] = useState<File | null>(null)
  const [uploading, setUploading]   = useState(false)

  const [viewing, setViewing]     = useState<Renter | null>(null)
  const [viewTab, setViewTab]     = useState<ViewTab>('Info')
  const [viewDocs, setViewDocs]   = useState<Doc[]>([])
  const [viewLoading, setViewLoading] = useState(false)

  const fetchRenters = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/renters`, { headers: headers() })
      if (res.status === 401) { router.push('/login'); return }
      if (!res.ok) throw new Error(`Failed to load tenants (${res.status})`)
      const data: Renter[] = await res.json()
      setRenters(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (!localStorage.getItem('apt_token')) { router.push('/login'); return }
    fetchRenters()
  }, [router, fetchRenters])

  useEffect(() => {
    fetch(`${API}/document/types`, { headers: headers() }).then(r => r.json()).then(d => Array.isArray(d) && setDocTypes(d)).catch(() => {})
  }, [])

  const filtered = renters.filter(r => {
    const q = search.toLowerCase()
    const matchSearch =
      (r.name ?? '').toLowerCase().includes(q) ||
      (r.email ?? '').toLowerCase().includes(q) ||
      (r.contact ?? '').toLowerCase().includes(q)
    const matchFilter =
      filter === 'all' ||
      (filter === 'active' && r.renter_status === 1) ||
      (filter === 'inactive' && r.renter_status === 0)
    return matchSearch && matchFilter
  })
  const { page, setPage, pageSize, pageItems } = usePagination(filtered, 10)

  const counts = {
    active:   renters.filter(r => r.renter_status === 1).length,
    inactive: renters.filter(r => r.renter_status === 0).length,
  }

  const loadDocs = async (renterId: number) => {
    const res = await fetch(`${API}/document/renter?renter_id=${renterId}`, { headers: headers() })
    setDocs(await res.json())
  }

  const openNew  = () => { setEditing(null); setForm(EMPTY_FORM); setDocs([]); setShowForm(true) }
  const openEdit = (r: Renter) => {
    setEditing(r)
    setForm({
      property_id:    String(r.property_id ?? ''),
      renter_type:    r.renter_type ?? 'individual',
      first_name:     r.first_name ?? '',
      middle_name:    r.middle_name ?? '',
      last_name:      r.last_name ?? '',
      company_type:   r.company_type ?? '',
      email:          r.email ?? '',
      contact:        r.contact ?? '',
      national_id:    r.national_id ?? '',
      rent_per_month: r.rent_per_month ?? '',
      advance_rent:   r.advance_rent ?? '',
      issue_date:     r.issue_date ? r.issue_date.slice(0, 10) : '',
      address:        r.address ?? '',
      renter_status:  String(r.renter_status),
    })
    setShowForm(true)
    loadDocs(r.id)
  }

  const openView = async (r: Renter) => {
    setViewTab('Info')
    setViewing(r)
    setViewLoading(true)
    try {
      const res = await fetch(`${API}/document/renter?renter_id=${r.id}`, { headers: headers() })
      setViewDocs(await res.json())
    } catch {
      setViewDocs([])
    } finally {
      setViewLoading(false)
    }
  }

  const save = async () => {
    if (!form.first_name || !form.email) return
    setSaving(true)
    setError(null)
    try {
      const body = {
        property_id:    Number(form.property_id) || 0,
        renter_type:    form.renter_type,
        first_name:     form.first_name,
        middle_name:    form.renter_type === 'company' ? null : form.middle_name,
        last_name:      form.renter_type === 'company' ? null : form.last_name,
        company_type:   form.renter_type === 'company' ? form.company_type : null,
        email:          form.email,
        contact:        form.contact,
        national_id:    form.national_id,
        rent_per_month: form.rent_per_month,
        advance_rent:   form.advance_rent,
        issue_date:     form.issue_date,
        address:        form.address,
        renter_status:  Number(form.renter_status),
      }
      const url    = editing ? `${API}/renters/${editing.id}` : `${API}/renters`
      const method = editing ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers: headers(), body: JSON.stringify(body) })
      if (!res.ok) throw new Error(`Save failed (${res.status})`)
      setShowForm(false)
      await fetchRenters()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const uploadDoc = async () => {
    if (!editing || !newDocType || !newDocFile) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', newDocFile)
      const upRes = await fetch(`${API}/document/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('apt_token')}` },
        body: fd,
      })
      const { url } = await upRes.json()
      await fetch(`${API}/document/renter`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ renter_id: editing.id, document_type: parseInt(newDocType, 10), document: url }),
      })
      setNewDocType(''); setNewDocFile(null)
      await loadDocs(editing.id)
    } catch {
      setError('Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const removeDoc = async (id: number) => {
    if (!editing) return
    await fetch(`${API}/document/renter/${id}`, { method: 'DELETE', headers: headers() })
    await loadDocs(editing.id)
  }

  const toggleEnabled = async (r: Renter) => {
    const newStatus = r.status === 1 ? 0 : 1
    setRenters(rs => rs.map(x => x.id === r.id ? { ...x, status: newStatus } : x))
    try {
      const res = await fetch(`${API}/renters/${r.id}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ status: newStatus }) })
      if (!res.ok) throw new Error()
    } catch {
      setRenters(rs => rs.map(x => x.id === r.id ? { ...x, status: r.status } : x))
      setError('Failed to update status')
    }
  }

  const del = async (id: number) => {
    if (!confirm('Remove this tenant?')) return
    setError(null)
    try {
      const res = await fetch(`${API}/renters/${id}`, { method: 'DELETE', headers: headers() })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      await fetchRenters()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const exportHeaders = ['#', 'Name', 'Type', 'Contact', 'Property Name', 'Floor', 'On Rent', 'Advance Rent', 'Rent Per Month', 'Enable/Disable']
  const exportRows = () => filtered.map((r, i) => [
    i + 1, r.name || '—', r.renter_type ?? 'individual', r.contact, r.property_name || '—', r.floor_name || '—',
    r.on_rent || '—', r.advance_rent, r.rent_per_month, r.status === 1 ? 'Enabled' : 'Disabled',
  ])
  const exportExcel = () => {
    const csv = [exportHeaders, ...exportRows()].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'renters.csv' })
    a.click()
  }
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Renters List', 14, 14)
    autoTable(doc, {
      head: [exportHeaders],
      body: exportRows().map(r => r.map(String)),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    })
    doc.save('renters.pdf')
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Tenants</h1>
          <p className="af-db-subtitle">
            {renters.length} total · {counts.active} active · {counts.inactive} expired
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Export To Excel
          </button>
          <button onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Export To Pdf
          </button>
          <button className="af-btn-primary" onClick={openNew} style={{ cursor: 'pointer', border: 'none' }}>
            + Add Tenant
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.10)', color: '#ef4444', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          className="af-prop-search"
          placeholder="Search tenants…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'active', 'inactive'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid', fontSize: 12.5,
                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                borderColor: filter === s ? 'var(--accent)' : 'var(--border2)',
                background:  filter === s ? 'rgba(249,115,22,0.12)' : 'var(--surface)',
                color:       filter === s ? 'var(--accent)' : 'var(--muted)',
                transition:  'all 0.13s',
              }}
            >
              {s === 'all'
                ? `All (${renters.length})`
                : `${s === 'active' ? 'Active' : 'Expired'} (${counts[s as keyof typeof counts]})`}
            </button>
          ))}
        </div>
      </div>

      <div className="af-prop-table-wrap" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 48, fontSize: 14 }}>
            Loading tenants…
          </div>
        ) : (
          <table className="af-prop-table" style={{ minWidth: 1100 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Type</th>
                <th>Contact</th>
                <th>Property Name</th>
                <th>Floor</th>
                <th>On Rent</th>
                <th>Advance Rent</th>
                <th>Rent Per Month</th>
                <th>Enable/Disable</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>
                    No tenants found
                  </td>
                </tr>
              )}
              {pageItems.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ color: 'var(--muted)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{(page - 1) * pageSize + i + 1}</td>
                  <td>
                    <div style={{ fontWeight: 650 }}>{r.name || '—'}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{r.email}</div>
                  </td>
                  <td>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100,
                      background: r.renter_type === 'company' ? 'rgba(59,130,246,0.12)' : 'rgba(168,85,247,0.12)',
                      color: r.renter_type === 'company' ? '#60a5fa' : '#c084fc',
                    }}>
                      {r.renter_type ?? 'individual'}
                    </span>
                  </td>
                  <td style={{ fontSize: 13 }}>{r.contact}</td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>{r.property_name || '—'}</td>
                  <td style={{ fontSize: 13 }}>{r.floor_name || '—'}</td>
                  <td style={{ fontSize: 13 }}>{r.on_rent || '—'}</td>
                  <td style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{r.advance_rent}</td>
                  <td style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{r.rent_per_month}</td>
                  <td>
                    <ToggleSwitch checked={r.status === 1} onChange={() => toggleEnabled(r)} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="af-prop-act edit" title="View" onClick={() => openView(r)} style={{ cursor: 'pointer' }}>👁</button>
                      <button className="af-prop-act edit" title="Edit" onClick={() => openEdit(r)} style={{ cursor: 'pointer' }}>✏️</button>
                      <button className="af-prop-act del" title="Delete" onClick={() => del(r.id)} style={{ cursor: 'pointer' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!loading && <Pagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />}

      {showForm && (
        <div className="af-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="af-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 900, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="af-modal-title">{editing ? 'Edit Tenant' : 'Add Tenant'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: editing ? '1fr 1fr' : '1fr', gap: 24 }}>
              <div className="af-modal-form">
                <div className="af-field">
                  <label>Renter Type</label>
                  <select className="af-select" value={form.renter_type} onChange={e => setForm(f => ({ ...f, renter_type: e.target.value }))}>
                    <option value="individual">Individual</option>
                    <option value="company">Company</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="af-field">
                    <label>{form.renter_type === 'company' ? 'Company Name' : 'First Name'}</label>
                    <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="John" />
                  </div>
                  {form.renter_type === 'company' ? (
                    <div className="af-field">
                      <label>Company Type</label>
                      <input value={form.company_type} onChange={e => setForm(f => ({ ...f, company_type: e.target.value }))} placeholder="Retail, Tech…" />
                    </div>
                  ) : (
                    <div className="af-field">
                      <label>Last Name</label>
                      <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Doe" />
                    </div>
                  )}
                </div>
                <div className="af-field">
                  <label>{form.renter_type === 'company' ? 'Company Email' : 'Email'}</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" />
                </div>
                <div className="af-field">
                  <label>{form.renter_type === 'company' ? 'Company Contact' : 'Contact'}</label>
                  <input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="+1 555-0100" />
                </div>
                <div className="af-field">
                  <label>National ID</label>
                  <input value={form.national_id} onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))} placeholder="NID-12345" />
                </div>
                <div className="af-field">
                  <label>Rent per month</label>
                  <input value={form.rent_per_month} onChange={e => setForm(f => ({ ...f, rent_per_month: e.target.value }))} placeholder="1200" />
                </div>
                <div className="af-field">
                  <label>Advance rent</label>
                  <input value={form.advance_rent} onChange={e => setForm(f => ({ ...f, advance_rent: e.target.value }))} placeholder="2400" />
                </div>
                <div className="af-field">
                  <label>Issue date</label>
                  <input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} />
                </div>
                <div className="af-field">
                  <label>Property ID</label>
                  <input type="number" value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} placeholder="1" />
                </div>
                <div className="af-field">
                  <label>Address</label>
                  <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St" />
                </div>
                <div className="af-field">
                  <label>Status</label>
                  <select className="af-select" value={form.renter_status} onChange={e => setForm(f => ({ ...f, renter_status: e.target.value }))}>
                    <option value="1">Active</option>
                    <option value="0">Expired</option>
                  </select>
                </div>

                {error && (
                  <div style={{ color: '#ef4444', fontSize: 12, marginTop: 10 }}>{error}</div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
                  <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setShowForm(false)} disabled={saving}>
                    Cancel
                  </button>
                  <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save} disabled={saving}>
                    {saving ? 'Saving…' : editing ? 'Save changes' : 'Add tenant'}
                  </button>
                </div>
              </div>

              {editing && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Documents</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    <select className="af-select" value={newDocType} onChange={e => setNewDocType(e.target.value)} style={{ flex: '1 1 140px' }}>
                      <option value="">-- Select Type --</option>
                      {docTypes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <div style={{ flex: '1 1 160px' }}>
                      <FileDropInput value={newDocFile} onChange={setNewDocFile} placeholder="Choose a document or drag it here" />
                    </div>
                    <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={uploadDoc} disabled={uploading || !newDocType || !newDocFile}>
                      {uploading ? 'Uploading…' : 'Upload'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {docs.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>No documents uploaded</div>}
                    {docs.map(d => (
                      <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
                        <a href={`${API}${d.document}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{d.document_type_name ?? 'Document'}</a>
                        <button onClick={() => removeDoc(d.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Renter Details */}
      {viewing && (
        <div className="af-modal-overlay" onClick={() => setViewing(null)}>
          <div className="af-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 650, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="af-modal-title">Renter Details</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: -14, marginBottom: 16 }}>{viewing.name}</p>

            <div className="af-tab-bar" style={{ marginBottom: 18 }}>
              {VIEW_TABS.map(t => (
                <button key={t} onClick={() => setViewTab(t)} className={`af-tab-pill ${viewTab === t ? 'active' : ''}`}>{t}</button>
              ))}
            </div>

            {viewTab === 'Info' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {([
                  ['Type', viewing.renter_type ?? 'individual'],
                  ['Company Type', viewing.company_type || '—'],
                  ['Name', viewing.name],
                  ['Email', viewing.email],
                  ['Contact', viewing.contact],
                  ['National ID', viewing.national_id || '—'],
                  ['Property', viewing.property_name || '—'],
                  ['Floor', viewing.floor_name || '—'],
                  ['On Rent', viewing.on_rent || '—'],
                  ['Lease Start', formatDate(viewing.lease_start_date)],
                  ['Lease End', formatDate(viewing.lease_end_date)],
                  ['Advance Rent', viewing.advance_rent],
                  ['Rent Per Month', viewing.rent_per_month],
                  ['Issue Date', formatDate(viewing.issue_date)],
                  ['Address', viewing.address || '—'],
                  ['Status', STATUS_LABEL[viewing.renter_status] ?? 'unknown'],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
            )}

            {viewTab === 'Documents' && (
              viewLoading ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>Loading…</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {viewDocs.length === 0 ? (
                    <div style={{ color: 'var(--muted)', fontSize: 13 }}>No documents uploaded</div>
                  ) : viewDocs.map(d => (
                    <a key={d.id} href={`${API}${d.document}`} target="_blank" rel="noreferrer"
                      style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--accent)' }}>
                      {d.document_type_name ?? 'Document'}
                    </a>
                  ))}
                </div>
              )
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
