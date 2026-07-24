'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import FileDropInput from '@/components/FileDropInput'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface MaintenanceType { id: number; name: string }
interface Doc { id: number; document_type: number; document: string; document_type_name: string }
interface DocType { id: number; name: string }

const REQUESTED_BY_OPTIONS = [
  { value: '0', label: 'Owner' },
  { value: '1', label: 'Renter' },
]

const isImage = (url: string) => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url)

const EMPTY_FORM = {
  property_id: '', floor_id: '', unit_id: '',
  type: '', title: '',
  date: '', maintenance_by: '0', description: '',
}

export default function MaintenanceForm({ maintenanceId }: { maintenanceId?: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [types, setTypes] = useState<MaintenanceType[]>([])
  const [properties, setProperties] = useState<{ id: number; property_name: string }[]>([])
  const [floors, setFloors] = useState<{ id: number; name: string }[]>([])
  const [units, setUnits] = useState<{ id: number; name: string }[]>([])
  const [docTypes, setDocTypes] = useState<DocType[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [newDocType, setNewDocType] = useState('')
  const [newDocFile, setNewDocFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pendingDocs, setPendingDocs] = useState<{ type: string; file: File | null }[]>([{ type: '', file: null }])

  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(!!maintenanceId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  useEffect(() => {
    fetch(`${API}/maintenance-type`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setTypes(d)).catch(() => {})
    fetch(`${API}/properties`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setProperties(d)).catch(() => {})
    fetch(`${API}/document/types`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setDocTypes(d)).catch(() => {})
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

  const loadDocs = useCallback(async (id: number) => {
    const res = await fetch(`${API}/document/maintenance?maintenance_id=${id}`, { headers: authHeaders() })
    setDocs(await res.json())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadRecord = useCallback(async (id: number) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/maintenance/${id}`, { headers: authHeaders() })
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      const r = await res.json()
      setForm({
        property_id: String(r.property_id ?? ''),
        floor_id: r.floor_id ? String(r.floor_id) : '',
        unit_id: r.unit_id ? String(r.unit_id) : '',
        type: String(r.type ?? ''),
        title: r.title ?? '',
        date: r.date ? r.date.slice(0, 16) : '',
        maintenance_by: r.maintenance_by ?? '0',
        description: r.description ?? '',
      })
      await fetchFloors(String(r.property_id ?? ''))
      await fetchUnits(String(r.property_id ?? ''), r.floor_id ? String(r.floor_id) : '')
      await loadDocs(id)
    } catch {
      setError('Failed to load maintenance record')
    } finally {
      setLoading(false)
    }
  }, [fetchFloors, fetchUnits, loadDocs])

  useEffect(() => {
    if (!maintenanceId) return
    loadRecord(maintenanceId)
  }, [maintenanceId, loadRecord])

  const onPropertyChange = (propertyId: string) => {
    setForm(f => ({ ...f, property_id: propertyId, floor_id: '', unit_id: '' }))
    setUnits([])
    fetchFloors(propertyId)
  }
  const onFloorChange = (floorId: string) => {
    setForm(f => ({ ...f, floor_id: floorId, unit_id: '' }))
    fetchUnits(form.property_id, floorId)
  }

  const uploadOne = async (id: number, documentType: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const upRes = await fetch(`${API}/document/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('apt_token')}` },
      body: fd,
    })
    const { url } = await upRes.json()
    await fetch(`${API}/document/maintenance`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ maintenance_id: id, document_type: parseInt(documentType, 10), document: url }),
    })
  }

  const uploadDoc = async () => {
    if (!maintenanceId || !newDocType || !newDocFile) return
    setUploading(true)
    try {
      await uploadOne(maintenanceId, newDocType, newDocFile)
      setNewDocType(''); setNewDocFile(null)
      await loadDocs(maintenanceId)
    } catch {
      setError('Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const removeDoc = async (id: number) => {
    if (!maintenanceId) return
    await fetch(`${API}/document/maintenance/${id}`, { method: 'DELETE', headers: authHeaders() })
    await loadDocs(maintenanceId)
  }

  const setPendingDoc = (i: number, patch: Partial<{ type: string; file: File | null }>) => {
    setPendingDocs(rows => rows.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }
  const addPendingDocRow = () => setPendingDocs(rows => [...rows, { type: '', file: null }])
  const removePendingDocRow = (i: number) => setPendingDocs(rows => rows.length === 1 ? rows : rows.filter((_, idx) => idx !== i))

  const save = async () => {
    if (!form.title || !form.property_id || !form.type || !form.date) return
    setSaving(true)
    setError('')
    try {
      const dateObj = new Date(form.date)
      const body: Record<string, unknown> = {
        property_id: parseInt(form.property_id, 10),
        floor_id: form.floor_id ? parseInt(form.floor_id, 10) : null,
        unit_id: form.unit_id ? parseInt(form.unit_id, 10) : null,
        type: form.type,
        title: form.title,
        date: form.date,
        month: dateObj.getMonth() + 1,
        year: dateObj.getFullYear(),
        maintenance_by: form.maintenance_by,
        description: form.description,
        status: 1,
      }
      if (!maintenanceId) body.maintenances_status = 1

      const url = maintenanceId ? `${API}/maintenance/${maintenanceId}` : `${API}/maintenance`
      const method = maintenanceId ? 'PUT' : 'POST'

      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)

      if (!maintenanceId) {
        const created = await res.json()
        const staged = pendingDocs.filter(d => d.type && d.file)
        for (const d of staged) {
          if (d.file) await uploadOne(created.id, d.type, d.file)
        }
      }

      router.push('/dashboard/maintenance')
    } catch {
      setError(maintenanceId ? 'Failed to update record' : 'Failed to save record')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>{maintenanceId ? 'Edit Maintenance' : 'Add New Maintenance'}</h1>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/maintenance')}>← Back to Maintenance</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start', maxWidth: 1000 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 750, marginBottom: 18 }}>Basic Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="af-field">
              <label>Title<span style={{ color: '#f87171' }}> *</span></label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" />
            </div>
            <div className="af-field">
              <label>Property<span style={{ color: '#f87171' }}> *</span></label>
              <select className="af-select" value={form.property_id} onChange={e => onPropertyChange(e.target.value)}>
                <option value="">-- Select Property --</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.property_name}</option>)}
              </select>
            </div>
            <div className="af-field">
              <label>Floor</label>
              <select className="af-select" value={form.floor_id} onChange={e => onFloorChange(e.target.value)}>
                <option value="">-- Select Floor --</option>
                {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="af-field">
              <label>Unit</label>
              <select className="af-select" value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))}>
                <option value="">-- Select Unit --</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="af-field">
              <label>Type<span style={{ color: '#f87171' }}> *</span></label>
              <select className="af-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="">-- Select Type --</option>
                {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="af-field">
              <label>Date<span style={{ color: '#f87171' }}> *</span></label>
              <input type="datetime-local" className="af-select" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="af-field">
              <label>Requested By</label>
              <select className="af-select" value={form.maintenance_by} onChange={e => setForm(f => ({ ...f, maintenance_by: e.target.value }))}>
                {REQUESTED_BY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="af-field" style={{ gridColumn: '1 / -1' }}>
              <label>Details</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Details"
                rows={3}
                style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 9, padding: '10px 14px', fontSize: 14, color: 'var(--text)', fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
            <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/maintenance')} disabled={saving}>Cancel</button>
            <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save} disabled={saving}>
              {saving ? 'Saving…' : maintenanceId ? 'Update' : 'Create'}
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 750, marginBottom: 18 }}>Documents</div>

          {!maintenanceId ? (
            <>
              {pendingDocs.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <select className="af-select" value={row.type} onChange={e => setPendingDoc(i, { type: e.target.value })} style={{ flex: '1 1 140px' }}>
                    <option value="">-- Select Type --</option>
                    {docTypes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <div style={{ flex: '1 1 200px' }}>
                    <FileDropInput value={row.file} onChange={file => setPendingDoc(i, { file })} placeholder="Choose a document or drag it here" />
                  </div>
                  {pendingDocs.length > 1 && (
                    <button onClick={() => removePendingDocRow(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>✕</button>
                  )}
                </div>
              ))}
              <button onClick={addPendingDocRow} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 }}>
                + Add More
              </button>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <select className="af-select" value={newDocType} onChange={e => setNewDocType(e.target.value)} style={{ flex: '1 1 140px' }}>
                  <option value="">-- Select Type --</option>
                  {docTypes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <div style={{ flex: '1 1 200px' }}>
                  <FileDropInput value={newDocFile} onChange={setNewDocFile} placeholder="Choose a document or drag it here" />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={uploadDoc} disabled={uploading || !newDocType || !newDocFile}>
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>

              {docs.length > 0 && (
                <div style={{ marginTop: 20, borderTop: '1px solid var(--border2)', paddingTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Uploaded Documents</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 16 }}>
                    {docs.map(d => (
                      <div key={d.id} style={{ position: 'relative' }}>
                        <button
                          onClick={() => removeDoc(d.id)}
                          title="Remove document"
                          style={{
                            position: 'absolute', top: -8, right: -8, zIndex: 1,
                            background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: '50%',
                            width: 22, height: 22, color: '#ef4444', cursor: 'pointer', fontSize: 12, lineHeight: 1,
                          }}
                        >
                          ✕
                        </button>
                        <a href={`${API}${d.document}`} target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
                          <div style={{
                            border: '1px solid var(--border2)', borderRadius: 10, overflow: 'hidden',
                            background: 'var(--surface2)', height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {isImage(d.document) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={`${API}${d.document}`} alt={d.document_type_name ?? 'Document'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: 32 }}>📄</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {d.document_type_name ?? 'Document'}
                          </div>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
