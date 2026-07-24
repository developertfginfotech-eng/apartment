'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import FileDropInput from '@/components/FileDropInput'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

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
}

const EMPTY_FORM: FormState = {
  landlord_id: '',
  property_name: '',
  property_code: '',
  property_type: '',
  ownership_percentage: '100',
  address: '',
}

export default function PropertyForm({ propertyId }: { propertyId?: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [owners, setOwners] = useState<Owner[]>([])
  const [types, setTypes] = useState<PropertyType[]>([])
  const [docTypes, setDocTypes] = useState<DocType[]>([])

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(!!propertyId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [floors, setFloors] = useState<Floor[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [newFloor, setNewFloor] = useState({ name: '', area: '' })
  const [newUnit, setNewUnit] = useState<Record<number, { name: string; area: string }>>({})
  const [newDocType, setNewDocType] = useState('')
  const [newDocFile, setNewDocFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  useEffect(() => {
    fetch(`${API}/landlords`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setOwners(d)).catch(() => {})
    fetch(`${API}/property-type`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setTypes(d)).catch(() => {})
    fetch(`${API}/document/types`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setDocTypes(d)).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadDetail = useCallback(async (id: number) => {
    const res = await fetch(`${API}/properties/${id}`, { headers: authHeaders() })
    const data = await res.json()
    setFloors(data.floors ?? [])
    setDocs(data.documents ?? [])
    return data
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!propertyId) return
    (async () => {
      setLoading(true)
      try {
        const data = await loadDetail(propertyId)
        setForm({
          landlord_id: data.landlord_id ? String(data.landlord_id) : '',
          property_name: data.property_name ?? '',
          property_code: data.property_code ?? '',
          property_type: data.property_type ?? '',
          ownership_percentage: data.ownership_percentage ?? '100',
          address: data.address ?? '',
        })
      } catch { setError('Failed to load property') }
      finally { setLoading(false) }
    })()
  }, [propertyId, loadDetail])

  const save = async () => {
    if (!form.property_name.trim() || !form.address.trim()) return
    setSaving(true); setError('')
    try {
      const url = propertyId ? `${API}/properties/${propertyId}` : `${API}/properties`
      const method = propertyId ? 'PUT' : 'POST'
      const body = { ...form, landlord_id: form.landlord_id ? parseInt(form.landlord_id, 10) : null }
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      router.push('/dashboard/properties')
    } catch { setError(propertyId ? 'Failed to update property' : 'Failed to create property') }
    finally { setSaving(false) }
  }

  const addFloor = async () => {
    if (!propertyId || !newFloor.name.trim()) return
    await fetch(`${API}/property-floor`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ property_id: propertyId, name: newFloor.name, area: parseFloat(newFloor.area) || 0 }),
    })
    setNewFloor({ name: '', area: '' })
    await loadDetail(propertyId)
  }

  const removeFloor = async (id: number) => {
    if (!propertyId) return
    await fetch(`${API}/property-floor/${id}`, { method: 'DELETE', headers: authHeaders() })
    await loadDetail(propertyId)
  }

  const addUnit = async (floorId: number) => {
    if (!propertyId) return
    const u = newUnit[floorId]
    if (!u?.name.trim()) return
    await fetch(`${API}/property-unit`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ property_id: propertyId, floor_id: floorId, name: u.name, area: parseFloat(u.area) || 0 }),
    })
    setNewUnit(m => ({ ...m, [floorId]: { name: '', area: '' } }))
    await loadDetail(propertyId)
  }

  const removeUnit = async (id: number) => {
    if (!propertyId) return
    await fetch(`${API}/property-unit/${id}`, { method: 'DELETE', headers: authHeaders() })
    await loadDetail(propertyId)
  }

  const uploadDoc = async () => {
    if (!propertyId || !newDocType || !newDocFile) return
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
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ property_id: propertyId, document_type: parseInt(newDocType, 10), document: url }),
      })
      setNewDocType(''); setNewDocFile(null)
      await loadDetail(propertyId)
    } catch { setError('Failed to upload document') }
    finally { setUploading(false) }
  }

  const removeDoc = async (id: number) => {
    if (!propertyId) return
    await fetch(`${API}/document/property/${id}`, { method: 'DELETE', headers: authHeaders() })
    await loadDetail(propertyId)
  }

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>{propertyId ? 'Edit Property' : 'Add Property'}</h1>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/properties')}>← Back to Properties</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: propertyId ? '1fr 1fr' : '1fr', gap: 24, alignItems: 'start' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: propertyId ? undefined : 820 }}>
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
                  <option value="">Property Type</option>
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
                <label>Percent(%) of ownership</label>
                <input type="number" value={form.ownership_percentage} onChange={e => setForm(f => ({ ...f, ownership_percentage: e.target.value }))} placeholder="100" />
              </div>
              <div className="af-field" style={{ gridColumn: '1 / -1' }}>
                <label>Location</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="12 Park Ave, New York" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/properties')} disabled={saving}>Cancel</button>
              <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save} disabled={saving}>
                {saving ? 'Saving…' : propertyId ? 'Save changes' : 'Create property'}
              </button>
            </div>
          </div>
        </div>

        {propertyId && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              {docs.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>No documents uploaded</div>}
              {docs.map(d => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
                  <a href={`${API}${d.document}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{d.document_type_name ?? 'Document'}</a>
                  <button onClick={() => removeDoc(d.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Floor/Unit</div>
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
                  <button className="af-btn-secondary" style={{ cursor: 'pointer', fontSize: 12, padding: '4px 10px' }} onClick={() => addUnit(f.id)}>+ Add More Unit</button>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6 }}>
              <input placeholder="Floor" value={newFloor.name} onChange={e => setNewFloor(f => ({ ...f, name: e.target.value }))} style={{ flex: 1, fontSize: 13, padding: '7px 10px' }} />
              <input placeholder="Area (m²)" type="number" value={newFloor.area} onChange={e => setNewFloor(f => ({ ...f, area: e.target.value }))} style={{ width: 90, fontSize: 13, padding: '7px 10px' }} />
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={addFloor}>+ Add More Floor</button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
