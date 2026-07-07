'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
})

interface Owner {
  id: number
  first_name: string
  middle_name: string | null
  last_name: string | null
  phone: string | null
  email: string | null
  owner_type: string | null
  company_type: string | null
  registration_date: string | null
  id_number: string | null
  country: string | null
  state: string | null
  city: string | null
  physical_address: string | null
  status: number // 1 = active, 0 = inactive
  total_property: number
  total_renter: number
}

interface OwnerProperty { id: number; property_name: string; property_code: string; address: string; total_floor: number; total_unit: number }
interface OwnerDetail extends Owner { properties: OwnerProperty[] }
interface Doc { id: number; document_type: number; document: string; document_type_name: string }
interface DocType { id: number; name: string }
interface Country { id: number; name: string }

type FormState = {
  owner_type: string
  first_name: string
  middle_name: string
  last_name: string
  company_type: string
  phone: string
  email: string
  registration_date: string
  id_number: string
  country: string
  state: string
  city: string
  physical_address: string
}

const BLANK_FORM: FormState = {
  owner_type: 'individual',
  first_name: '',
  middle_name: '',
  last_name: '',
  company_type: '',
  phone: '',
  email: '',
  registration_date: '',
  id_number: '',
  country: '',
  state: '',
  city: '',
  physical_address: '',
}

const VIEW_TABS = ['Info', 'Properties', 'Documents'] as const
type ViewTab = typeof VIEW_TABS[number]

export default function OwnersPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [owners, setOwners]         = useState<Owner[]>([])
  const [countries, setCountries]   = useState<Country[]>([])
  const [docTypes, setDocTypes]     = useState<DocType[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState<Owner | null>(null)
  const [form, setForm]             = useState<FormState>(BLANK_FORM)
  const [saving, setSaving]         = useState(false)
  const [deleteId, setDeleteId]     = useState<number | null>(null)
  const [deleting, setDeleting]     = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const [docs, setDocs]             = useState<Doc[]>([])
  const [newDocType, setNewDocType] = useState('')
  const [newDocFile, setNewDocFile] = useState<File | null>(null)
  const [uploading, setUploading]   = useState(false)

  const [viewing, setViewing]       = useState<OwnerDetail | null>(null)
  const [viewTab, setViewTab]       = useState<ViewTab>('Info')
  const [viewLoading, setViewLoading] = useState(false)

  async function fetchOwners() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/landlords`, { headers: headers() })
      if (!res.ok) throw new Error(`Failed to load owners (${res.status})`)
      const data: Owner[] = await res.json()
      setOwners(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load owners')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOwners() }, [])

  useEffect(() => {
    fetch(`${API}/landlords/countries`, { headers: headers() }).then(r => r.json()).then(d => Array.isArray(d) && setCountries(d)).catch(() => {})
    fetch(`${API}/document/types`, { headers: headers() }).then(r => r.json()).then(d => Array.isArray(d) && setDocTypes(d)).catch(() => {})
  }, [])

  const filtered = owners.filter(o => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    const name = `${o.first_name ?? ''} ${o.last_name ?? ''}`.toLowerCase()
    return (
      name.includes(q) ||
      (o.email ?? '').toLowerCase().includes(q) ||
      (o.phone ?? '').includes(q)
    )
  })

  function openAdd() {
    setEditTarget(null)
    setForm(BLANK_FORM)
    setModalOpen(true)
  }

  const loadDocs = async (landlordId: number) => {
    const res = await fetch(`${API}/document/landlord?landlord_id=${landlordId}`, { headers: headers() })
    setDocs(await res.json())
  }

  function openEdit(o: Owner) {
    setEditTarget(o)
    setForm({
      owner_type:        o.owner_type ?? 'individual',
      first_name:        o.first_name ?? '',
      middle_name:       o.middle_name ?? '',
      last_name:         o.last_name ?? '',
      company_type:      o.company_type ?? '',
      phone:             o.phone ?? '',
      email:             o.email ?? '',
      registration_date: o.registration_date ? o.registration_date.slice(0, 10) : '',
      id_number:         o.id_number ?? '',
      country:           o.country ?? '',
      state:             o.state ?? '',
      city:              o.city ?? '',
      physical_address:  o.physical_address ?? '',
    })
    setModalOpen(true)
    loadDocs(o.id)
  }

  const openView = async (o: Owner) => {
    setViewTab('Info')
    setViewLoading(true)
    try {
      const [detailRes, docsRes] = await Promise.all([
        fetch(`${API}/landlords/${o.id}`, { headers: headers() }),
        fetch(`${API}/document/landlord?landlord_id=${o.id}`, { headers: headers() }),
      ])
      const detail = await detailRes.json()
      setDocs(await docsRes.json())
      setViewing(detail)
    } catch {
      setError('Failed to load owner details')
    } finally {
      setViewLoading(false)
    }
  }

  async function saveOwner() {
    const trimmed = {
      owner_type:        form.owner_type,
      first_name:        form.first_name.trim(),
      middle_name:       form.middle_name.trim(),
      last_name:         form.last_name.trim(),
      company_type:      form.owner_type === 'company' ? form.company_type.trim() : null,
      phone:             form.phone.trim(),
      email:             form.email.trim(),
      registration_date: form.registration_date || null,
      id_number:         form.id_number.trim(),
      country:           form.country.trim(),
      state:             form.state.trim(),
      city:              form.city.trim(),
      physical_address:  form.physical_address.trim(),
    }
    if (!trimmed.first_name) return
    setSaving(true)
    try {
      if (editTarget) {
        const res = await fetch(`${API}/landlords/${editTarget.id}`, {
          method: 'PUT',
          headers: headers(),
          body: JSON.stringify(trimmed),
        })
        if (!res.ok) throw new Error(`Failed to update owner (${res.status})`)
      } else {
        const res = await fetch(`${API}/landlords`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ ...trimmed, status: 1 }),
        })
        if (!res.ok) throw new Error(`Failed to create owner (${res.status})`)
      }
      setModalOpen(false)
      await fetchOwners()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save owner')
    } finally {
      setSaving(false)
    }
  }

  const uploadDoc = async () => {
    if (!editTarget || !newDocType || !newDocFile) return
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
      await fetch(`${API}/document/landlord`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ landlord_id: editTarget.id, document_type: parseInt(newDocType, 10), document: url }),
      })
      setNewDocType(''); setNewDocFile(null)
      await loadDocs(editTarget.id)
    } catch {
      setError('Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const removeDoc = async (id: number) => {
    if (!editTarget) return
    await fetch(`${API}/document/landlord/${id}`, { method: 'DELETE', headers: headers() })
    await loadDocs(editTarget.id)
  }

  async function toggleStatus(o: Owner) {
    const newStatus = o.status === 1 ? 0 : 1
    try {
      const res = await fetch(`${API}/landlords/${o.id}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error(`Failed to update status (${res.status})`)
      await fetchOwners()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  async function confirmDelete() {
    if (deleteId === null) return
    setDeleting(true)
    try {
      const res = await fetch(`${API}/landlords/${deleteId}`, {
        method: 'DELETE',
        headers: headers(),
      })
      if (!res.ok) throw new Error(`Failed to delete owner (${res.status})`)
      setDeleteId(null)
      await fetchOwners()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete owner')
    } finally {
      setDeleting(false)
    }
  }

  function setField(key: keyof FormState, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  const exportHeaders = ['#', 'First Name', 'Last Name', 'Phone', 'Email', 'Owner Type', 'No Property', 'No Renter', 'Status']
  const exportRows = () => filtered.map((o, i) => [
    i + 1, o.first_name, o.last_name || '—', o.phone || '—', o.email || '—', o.owner_type || '—',
    o.total_property, o.total_renter, o.status === 1 ? 'Active' : 'Inactive',
  ])
  const exportExcel = () => {
    const csv = [exportHeaders, ...exportRows()].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'owners.csv' })
    a.click()
  }
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Property Owners List', 14, 14)
    autoTable(doc, {
      head: [exportHeaders],
      body: exportRows().map(r => r.map(String)),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    })
    doc.save('owners.pdf')
  }

  return (
    <main className="af-db-main">

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 className="af-db-greeting">Owners</h1>
          <p className="af-db-subtitle">{owners.length} total owner{owners.length !== 1 ? 's' : ''} registered</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Export To Excel
          </button>
          <button onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Export To Pdf
          </button>
          <button className="af-btn-primary" onClick={openAdd}>+ Add Owner</button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#f87171', borderRadius: 8, padding: '10px 16px',
          marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 700, fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ── Search ── */}
      <input
        className="af-prop-search"
        placeholder="Search by name, email or phone…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 18, width: '100%', maxWidth: 380 }}
      />

      {/* ── Table ── */}
      <div className="af-prop-table-wrap">
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '48px 0', fontSize: 14 }}>
            Loading owners…
          </div>
        ) : (
          <table className="af-prop-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Country</th>
                <th>City</th>
                <th>No Property</th>
                <th>No Renter</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)', padding: '36px 0' }}>
                    No owners found
                  </td>
                </tr>
              ) : (
                filtered.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>
                      {[o.first_name, o.middle_name, o.last_name].filter(Boolean).join(' ')}
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{o.phone ?? '—'}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{o.email ?? '—'}</td>
                    <td style={{ fontSize: 13 }}>{o.country ?? '—'}</td>
                    <td style={{ fontSize: 13 }}>{o.city ?? '—'}</td>
                    <td style={{ fontSize: 13 }}>{o.total_property}</td>
                    <td style={{ fontSize: 13 }}>{o.total_renter}</td>
                    <td>
                      <button
                        className={`af-prop-badge ${o.status === 1 ? 'active' : 'inactive'}`}
                        onClick={() => toggleStatus(o)}
                        style={{
                          cursor: 'pointer',
                          background: 'transparent',
                          border: '1px solid var(--border2)',
                          borderRadius: 6,
                          padding: '3px 10px',
                          fontSize: 12,
                          fontWeight: 600,
                          textTransform: 'capitalize',
                        }}
                        title="Click to toggle status"
                      >
                        {o.status === 1 ? 'active' : 'inactive'}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="af-prop-act edit" onClick={() => openView(o)} style={{ padding: '4px 14px', fontSize: 12, borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                          View
                        </button>
                        <button
                          className="af-prop-act edit"
                          onClick={() => openEdit(o)}
                          style={{ padding: '4px 14px', fontSize: 12, borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Edit
                        </button>
                        <button
                          className="af-prop-act del"
                          onClick={() => setDeleteId(o.id)}
                          style={{ padding: '4px 14px', fontSize: 12, borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {modalOpen && (
        <div className="af-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="af-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 900, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="af-modal-title">{editTarget ? 'Edit Owner' : 'Add Owner'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: editTarget ? '1fr 1fr' : '1fr', gap: 24 }}>
              <div className="af-modal-form">

                <div className="af-field">
                  <label>Owner Type</label>
                  <select className="af-select" value={form.owner_type} onChange={e => setField('owner_type', e.target.value)}>
                    <option value="individual">Individual</option>
                    <option value="company">Company</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="af-field">
                    <label>{form.owner_type === 'company' ? 'Company Name' : 'First Name'} <span style={{ color: '#f87171' }}>*</span></label>
                    <input type="text" value={form.first_name} onChange={e => setField('first_name', e.target.value)} placeholder="First name" />
                  </div>
                  <div className="af-field">
                    <label>Last Name</label>
                    <input type="text" value={form.last_name} onChange={e => setField('last_name', e.target.value)} placeholder="Last name" disabled={form.owner_type === 'company'} />
                  </div>
                </div>

                {form.owner_type === 'company' ? (
                  <div className="af-field">
                    <label>Company Type</label>
                    <input type="text" value={form.company_type} onChange={e => setField('company_type', e.target.value)} placeholder="Corporation, LLC…" />
                  </div>
                ) : (
                  <div className="af-field">
                    <label>Middle Name</label>
                    <input type="text" value={form.middle_name} onChange={e => setField('middle_name', e.target.value)} placeholder="Middle name (optional)" />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="af-field">
                    <label>Phone</label>
                    <input type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+1-555-0000" />
                  </div>
                  <div className="af-field">
                    <label>Email</label>
                    <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="email@example.com" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="af-field">
                    <label>Registration Date</label>
                    <input type="date" value={form.registration_date} onChange={e => setField('registration_date', e.target.value)} />
                  </div>
                  <div className="af-field">
                    <label>National ID or Passport</label>
                    <input type="text" value={form.id_number} onChange={e => setField('id_number', e.target.value)} placeholder="ID number" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="af-field">
                    <label>Country</label>
                    {countries.length > 0 ? (
                      <select className="af-select" value={form.country} onChange={e => setField('country', e.target.value)}>
                        <option value="">-- Select Country --</option>
                        {countries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={form.country} onChange={e => setField('country', e.target.value)} placeholder="Country" />
                    )}
                  </div>
                  <div className="af-field">
                    <label>State</label>
                    <input type="text" value={form.state} onChange={e => setField('state', e.target.value)} placeholder="State" />
                  </div>
                </div>

                <div className="af-field">
                  <label>City</label>
                  <input type="text" value={form.city} onChange={e => setField('city', e.target.value)} placeholder="City" />
                </div>

                <div className="af-field">
                  <label>Physical Address</label>
                  <input type="text" value={form.physical_address} onChange={e => setField('physical_address', e.target.value)} placeholder="Street, City" />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <button className="af-auth-submit" style={{ flex: 1, opacity: saving ? 0.7 : 1 }} onClick={saveOwner} disabled={saving}>
                    {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Owner'}
                  </button>
                  <button
                    className="af-btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => setModalOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>

              </div>

              {editTarget && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Documents</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    <select className="af-select" value={newDocType} onChange={e => setNewDocType(e.target.value)} style={{ flex: '1 1 140px' }}>
                      <option value="">-- Select Type --</option>
                      {docTypes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <input type="file" onChange={e => setNewDocFile(e.target.files?.[0] ?? null)} style={{ flex: '1 1 160px', fontSize: 12 }} />
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

      {/* ── Delete Confirmation Modal ── */}
      {deleteId !== null && (
        <div className="af-modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="af-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">Delete Owner</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
              Are you sure you want to delete this owner? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{
                  flex: 1, padding: '10px', borderRadius: 9,
                  background: 'rgba(239,68,68,0.15)', color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.3)',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontWeight: 650, fontSize: 14, fontFamily: 'inherit',
                  opacity: deleting ? 0.7 : 1,
                }}
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
              <button className="af-btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteId(null)} disabled={deleting}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Owner Details ── */}
      {viewing && (
        <div className="af-modal-overlay" onClick={() => setViewing(null)}>
          <div className="af-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="af-modal-title">Property Owner Details</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: -14, marginBottom: 16 }}>
              {[viewing.first_name, viewing.middle_name, viewing.last_name].filter(Boolean).join(' ')}
            </p>

            <div className="af-tab-bar" style={{ marginBottom: 18 }}>
              {VIEW_TABS.map(t => (
                <button key={t} onClick={() => setViewTab(t)} className={`af-tab-pill ${viewTab === t ? 'active' : ''}`}>{t}</button>
              ))}
            </div>

            {viewLoading ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>Loading…</div>
            ) : (
              <>
                {viewTab === 'Info' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {([
                      ['Owner Type', viewing.owner_type || '—'],
                      ['Company Type', viewing.company_type || '—'],
                      ['First Name', viewing.first_name],
                      ['Last Name', viewing.last_name || '—'],
                      ['Phone', viewing.phone || '—'],
                      ['Email', viewing.email || '—'],
                      ['Registration Date', viewing.registration_date?.slice(0, 10) || '—'],
                      ['National ID', viewing.id_number || '—'],
                      ['Country', viewing.country || '—'],
                      ['State', viewing.state || '—'],
                      ['City', viewing.city || '—'],
                      ['Physical Address', viewing.physical_address || '—'],
                    ] as [string, string][]).map(([k, v]) => (
                      <div key={k} style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px' }}>
                        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}

                {viewTab === 'Properties' && (
                  <div className="af-prop-table-wrap">
                    <table className="af-prop-table">
                      <thead><tr><th>Code</th><th>Name</th><th>Location</th><th>Floors</th><th>Units</th></tr></thead>
                      <tbody>
                        {viewing.properties.length === 0 ? (
                          <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No properties found</td></tr>
                        ) : viewing.properties.map(p => (
                          <tr key={p.id}>
                            <td style={{ fontVariantNumeric: 'tabular-nums' }}>{p.property_code}</td>
                            <td style={{ fontWeight: 600 }}>{p.property_name}</td>
                            <td style={{ fontSize: 13 }}>{p.address}</td>
                            <td style={{ fontSize: 13 }}>{p.total_floor}</td>
                            <td style={{ fontSize: 13 }}>{p.total_unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {viewTab === 'Documents' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {docs.length === 0 ? (
                      <div style={{ color: 'var(--muted)', fontSize: 13 }}>No documents uploaded</div>
                    ) : docs.map(d => (
                      <a key={d.id} href={`${API}${d.document}`} target="_blank" rel="noreferrer"
                        style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--accent)' }}>
                        {d.document_type_name ?? 'Document'}
                      </a>
                    ))}
                  </div>
                )}
              </>
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
