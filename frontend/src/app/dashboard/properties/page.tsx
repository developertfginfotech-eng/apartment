'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Property {
  id: number
  landlord_id: number | null
  owner_name: string | null
  property_type: string
  property_name: string
  property_code: string
  ownership_percentage: string
  address: string
  status: number
  total_floor: number
  total_unit: number
}

interface Floor { id: number; name: string; area: number; units: Unit[] }
interface Unit { id: number; floor_id: number; name: string; area: number }
interface Doc { id: number; document_type: number; document: string; document_type_name: string }
interface Owner { id: number; first_name: string; last_name: string | null }
interface PropertyType { id: number; name: string }
interface DocType { id: number; name: string }

type FormState = {
  landlord_id: string
  property_name: string
  property_code: string
  property_type: string
  ownership_percentage: string
  address: string
  status: number
}

const EMPTY_FORM: FormState = {
  landlord_id: '',
  property_name: '',
  property_code: '',
  property_type: '',
  ownership_percentage: '100',
  address: '',
  status: 1,
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
})

export default function PropertiesPage() {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [owners, setOwners]         = useState<Owner[]>([])
  const [types, setTypes]           = useState<PropertyType[]>([])
  const [docTypes, setDocTypes]     = useState<DocType[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState<Property | null>(null)
  const [saving, setSaving]         = useState(false)
  const [search, setSearch]         = useState('')
  const [form, setForm]             = useState<FormState>(EMPTY_FORM)

  const [floors, setFloors]     = useState<Floor[]>([])
  const [docs, setDocs]         = useState<Doc[]>([])
  const [newFloor, setNewFloor] = useState({ name: '', area: '' })
  const [newUnit, setNewUnit]   = useState<Record<number, { name: string; area: string }>>({})
  const [newDocType, setNewDocType] = useState('')
  const [newDocFile, setNewDocFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const fetchProperties = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/properties`, { headers: headers() })
      if (res.status === 401) { router.push('/login'); return }
      if (!res.ok) throw new Error(`Failed to load properties (${res.status})`)
      const data: Property[] = await res.json()
      setProperties(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    const token = localStorage.getItem('apt_token')
    if (!token) { router.push('/login'); return }
    fetchProperties()
  }, [router, fetchProperties])

  useEffect(() => {
    fetch(`${API}/landlords`, { headers: headers() }).then(r => r.json()).then(d => Array.isArray(d) && setOwners(d)).catch(()=>{})
    fetch(`${API}/property-type`, { headers: headers() }).then(r => r.json()).then(d => Array.isArray(d) && setTypes(d)).catch(()=>{})
    fetch(`${API}/document/types`, { headers: headers() }).then(r => r.json()).then(d => Array.isArray(d) && setDocTypes(d)).catch(()=>{})
  }, [])

  const filtered = properties.filter(p =>
    p.property_name.toLowerCase().includes(search.toLowerCase()) ||
    p.property_code.toLowerCase().includes(search.toLowerCase()) ||
    p.address?.toLowerCase().includes(search.toLowerCase())
  )

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFloors([])
    setDocs([])
    setShowForm(true)
  }

  const loadDetail = async (id: number) => {
    const res = await fetch(`${API}/properties/${id}`, { headers: headers() })
    const data = await res.json()
    setFloors(data.floors ?? [])
    setDocs(data.documents ?? [])
  }

  const openEdit = async (p: Property) => {
    setEditing(p)
    setForm({
      landlord_id: p.landlord_id ? String(p.landlord_id) : '',
      property_name: p.property_name,
      property_code: p.property_code,
      property_type: p.property_type,
      ownership_percentage: p.ownership_percentage ?? '100',
      address: p.address,
      status: p.status,
    })
    setShowForm(true)
    await loadDetail(p.id)
  }

  const save = async () => {
    if (!form.property_name.trim() || !form.address.trim()) return
    setSaving(true)
    setError(null)
    try {
      const url    = editing ? `${API}/properties/${editing.id}` : `${API}/properties`
      const method = editing ? 'PUT' : 'POST'
      const body = { ...form, landlord_id: form.landlord_id ? parseInt(form.landlord_id, 10) : null }
      const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(body) })
      if (res.status === 401) { router.push('/login'); return }
      if (!res.ok) throw new Error(`Save failed (${res.status})`)
      if (!editing) {
        const created = await res.json()
        setEditing({ ...created, owner_name: null, total_floor: 0, total_unit: 0 })
        await loadDetail(created.id)
      }
      await fetchProperties()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this property?')) return
    setError(null)
    try {
      const res = await fetch(`${API}/properties/${id}`, { method: 'DELETE', headers: headers() })
      if (res.status === 401) { router.push('/login'); return }
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      await fetchProperties()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const addFloor = async () => {
    if (!editing || !newFloor.name.trim()) return
    await fetch(`${API}/property-floor`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ property_id: editing.id, name: newFloor.name, area: parseFloat(newFloor.area) || 0 }),
    })
    setNewFloor({ name: '', area: '' })
    await loadDetail(editing.id)
  }

  const removeFloor = async (id: number) => {
    if (!editing) return
    await fetch(`${API}/property-floor/${id}`, { method: 'DELETE', headers: headers() })
    await loadDetail(editing.id)
  }

  const addUnit = async (floorId: number) => {
    if (!editing) return
    const u = newUnit[floorId]
    if (!u?.name.trim()) return
    await fetch(`${API}/property-unit`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ property_id: editing.id, floor_id: floorId, name: u.name, area: parseFloat(u.area) || 0 }),
    })
    setNewUnit(m => ({ ...m, [floorId]: { name: '', area: '' } }))
    await loadDetail(editing.id)
  }

  const removeUnit = async (id: number) => {
    if (!editing) return
    await fetch(`${API}/property-unit/${id}`, { method: 'DELETE', headers: headers() })
    await loadDetail(editing.id)
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
      await fetch(`${API}/document/property`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ property_id: editing.id, document_type: parseInt(newDocType, 10), document: url }),
      })
      setNewDocType(''); setNewDocFile(null)
      await loadDetail(editing.id)
    } catch {
      setError('Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const removeDoc = async (id: number) => {
    if (!editing) return
    await fetch(`${API}/document/property/${id}`, { method: 'DELETE', headers: headers() })
    await loadDetail(editing.id)
  }

  const activeCount = properties.filter(p => p.status === 1).length

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Properties</h1>
          <p className="af-db-subtitle">
            {loading ? 'Loading…' : `${properties.length} total · ${activeCount} active`}
          </p>
        </div>
        <button className="af-btn-primary" onClick={openNew} style={{ cursor: 'pointer', border: 'none' }} disabled={loading}>
          + Add Property
        </button>
      </div>

      {error && !showForm && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <input className="af-prop-search" placeholder="Search by name, code, or address…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '48px 0' }}>Loading properties…</div>
      ) : (
        <div className="af-prop-table-wrap">
          <table className="af-prop-table">
            <thead>
              <tr>
                <th>Property Name</th><th>Code</th><th>Owner</th><th>Type</th>
                <th>Floors</th><th>Units</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px' }}>No properties found</td></tr>
              )}
              {filtered.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 650 }}>{p.property_name}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{p.property_code}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{p.owner_name?.trim() || '—'}</td>
                  <td><span className="af-prop-badge type">{p.property_type}</span></td>
                  <td>{p.total_floor}</td>
                  <td>{p.total_unit}</td>
                  <td>
                    <span className={`af-prop-badge ${p.status === 1 ? 'active' : 'inactive'}`}>
                      {p.status === 1 ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="af-prop-act edit" onClick={() => openEdit(p)}>Edit</button>
                      <button className="af-prop-act del" onClick={() => del(p.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="af-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="af-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 900, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="af-modal-title">{editing ? 'Edit Property' : 'Add Property'}</h2>

            <div style={{ display: 'grid', gridTemplateColumns: editing ? '1fr 1fr' : '1fr', gap: 24 }}>
              <div className="af-modal-form">
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Basic Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="af-field">
                    <label>Owner</label>
                    <select className="af-select" value={form.landlord_id} onChange={e => setForm(f => ({ ...f, landlord_id: e.target.value }))}>
                      <option value="">-- Select Owner --</option>
                      {owners.map(o => <option key={o.id} value={o.id}>{o.first_name} {o.last_name ?? ''}</option>)}
                    </select>
                  </div>
                  <div className="af-field">
                    <label>Property Type</label>
                    <select className="af-select" value={form.property_type} onChange={e => setForm(f => ({ ...f, property_type: e.target.value }))}>
                      <option value="">-- Select Type --</option>
                      {types.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="af-field">
                    <label>Property Name</label>
                    <input value={form.property_name} onChange={e => setForm(f => ({ ...f, property_name: e.target.value }))} placeholder="Sunrise Towers" />
                  </div>
                  <div className="af-field">
                    <label>Property Code</label>
                    <input value={form.property_code} onChange={e => setForm(f => ({ ...f, property_code: e.target.value }))} placeholder="PROP-001" />
                  </div>
                  <div className="af-field">
                    <label>Percent (%) of ownership</label>
                    <input type="number" value={form.ownership_percentage} onChange={e => setForm(f => ({ ...f, ownership_percentage: e.target.value }))} placeholder="100" />
                  </div>
                  <div className="af-field">
                    <label>Status</label>
                    <select className="af-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: Number(e.target.value) }))}>
                      <option value={1}>Active</option>
                      <option value={0}>Inactive</option>
                    </select>
                  </div>
                  <div className="af-field" style={{ gridColumn: '1 / -1' }}>
                    <label>Location</label>
                    <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="12 Park Ave, New York" />
                  </div>
                </div>

                {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 10 }}>{error}</p>}

                <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
                  <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
                  <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save} disabled={saving}>
                    {saving ? 'Saving…' : editing ? 'Save changes' : 'Create property'}
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
                    <input type="file" onChange={e => setNewDocFile(e.target.files?.[0] ?? null)} style={{ flex: '1 1 160px', fontSize: 12 }} />
                    <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={uploadDoc} disabled={uploading || !newDocType || !newDocFile}>
                      {uploading ? 'Uploading…' : 'Upload'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                    {docs.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>No documents uploaded</div>}
                    {docs.map(d => (
                      <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
                        <a href={`${API}${d.document}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{d.document_type_name ?? 'Document'}</a>
                        <button onClick={() => removeDoc(d.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Floor / Unit</div>
                  {floors.map(f => (
                    <div key={f.id} style={{ background: 'var(--surface2)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontWeight: 650, fontSize: 13 }}>{f.name} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({f.area} m²)</span></div>
                        <button onClick={() => removeFloor(f.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                      </div>
                      {f.units.map(u => (
                        <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0 4px 14px', fontSize: 12.5 }}>
                          <span>{u.name} ({u.area} m²)</span>
                          <button onClick={() => removeUnit(u.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, paddingLeft: 14 }}>
                        <input placeholder="Unit" value={newUnit[f.id]?.name ?? ''} onChange={e => setNewUnit(m => ({ ...m, [f.id]: { name: e.target.value, area: m[f.id]?.area ?? '' } }))} style={{ flex: 1, fontSize: 12, padding: '5px 8px' }} />
                        <input placeholder="Area" type="number" value={newUnit[f.id]?.area ?? ''} onChange={e => setNewUnit(m => ({ ...m, [f.id]: { name: m[f.id]?.name ?? '', area: e.target.value } }))} style={{ width: 70, fontSize: 12, padding: '5px 8px' }} />
                        <button className="af-btn-secondary" style={{ cursor: 'pointer', fontSize: 12, padding: '4px 10px' }} onClick={() => addUnit(f.id)}>+ Unit</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input placeholder="Floor" value={newFloor.name} onChange={e => setNewFloor(f => ({ ...f, name: e.target.value }))} style={{ flex: 1, fontSize: 13, padding: '7px 10px' }} />
                    <input placeholder="Area (m²)" type="number" value={newFloor.area} onChange={e => setNewFloor(f => ({ ...f, area: e.target.value }))} style={{ width: 90, fontSize: 13, padding: '7px 10px' }} />
                    <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={addFloor}>+ Floor</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
