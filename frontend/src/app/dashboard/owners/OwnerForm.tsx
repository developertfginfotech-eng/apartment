'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import FileDropInput from '@/components/FileDropInput'
import DatePicker from '@/components/DatePicker'
import { toDateInputValue } from '@/lib/date'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const isImage = (url: string) => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url)

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
  city: string
  postal_address: string
  physical_address: string
  residential_address: string
  password: string
  confirm_password: string
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
  city: '',
  postal_address: '',
  physical_address: '',
  residential_address: '',
  password: '',
  confirm_password: '',
}

export default function OwnerForm({ ownerId }: { ownerId?: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [countries, setCountries] = useState<Country[]>([])
  const [docTypes, setDocTypes] = useState<DocType[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [newDocType, setNewDocType] = useState('')
  const [newDocFile, setNewDocFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pendingDocs, setPendingDocs] = useState<{ type: string; file: File | null }[]>([{ type: '', file: null }])

  const [form, setForm] = useState<FormState>(BLANK_FORM)
  const [loading, setLoading] = useState(!!ownerId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  useEffect(() => {
    fetch(`${API}/landlords/countries`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setCountries(d)).catch(() => {})
    fetch(`${API}/document/types`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setDocTypes(d)).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadDocs = useCallback(async (landlordId: number) => {
    const res = await fetch(`${API}/document/landlord?landlord_id=${landlordId}`, { headers: authHeaders() })
    setDocs(await res.json())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ownerId) return
    (async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/landlords/${ownerId}`, { headers: authHeaders() })
        const o = await res.json()
        setForm({
          owner_type:        o.owner_type ?? 'individual',
          first_name:        o.first_name ?? '',
          middle_name:       o.middle_name ?? '',
          last_name:         o.last_name ?? '',
          company_type:      o.company_type ?? '',
          phone:             o.phone ?? '',
          email:             o.email ?? '',
          registration_date:    toDateInputValue(o.registration_date),
          id_number:            o.id_number ?? '',
          country:              o.country ?? '',
          city:                 o.city ?? '',
          postal_address:       o.postal_address ?? '',
          physical_address:     o.physical_address ?? '',
          residential_address:  o.residential_address ?? '',
          password:             '',
          confirm_password:     '',
        })
        await loadDocs(ownerId)
      } catch { setError('Failed to load owner') }
      finally { setLoading(false) }
    })()
  }, [ownerId, loadDocs])

  function setField(key: keyof FormState, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  const uploadOne = async (landlordId: number, documentType: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const upRes = await fetch(`${API}/document/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('apt_token')}` },
      body: fd,
    })
    const { url } = await upRes.json()
    await fetch(`${API}/document/landlord`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ landlord_id: landlordId, document_type: parseInt(documentType, 10), document: url }),
    })
  }

  const uploadDoc = async () => {
    if (!ownerId || !newDocType || !newDocFile) return
    setUploading(true)
    try {
      await uploadOne(ownerId, newDocType, newDocFile)
      setNewDocType(''); setNewDocFile(null)
      await loadDocs(ownerId)
    } catch { setError('Failed to upload document') }
    finally { setUploading(false) }
  }

  const removeDoc = async (id: number) => {
    if (!ownerId) return
    await fetch(`${API}/document/landlord/${id}`, { method: 'DELETE', headers: authHeaders() })
    await loadDocs(ownerId)
  }

  const setPendingDoc = (i: number, patch: Partial<{ type: string; file: File | null }>) => {
    setPendingDocs(rows => rows.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }
  const addPendingDocRow = () => setPendingDocs(rows => [...rows, { type: '', file: null }])
  const removePendingDocRow = (i: number) => setPendingDocs(rows => rows.length === 1 ? rows : rows.filter((_, idx) => idx !== i))

  const save = async () => {
    if (!form.first_name.trim()) return
    if (!ownerId && (!form.password || form.password !== form.confirm_password)) {
      setError('Password and Confirm Password must match')
      return
    }
    if (form.password && form.password !== form.confirm_password) {
      setError('Password and Confirm Password must match')
      return
    }
    const trimmed: Record<string, unknown> = {
      owner_type:           form.owner_type,
      first_name:           form.first_name.trim(),
      middle_name:          form.middle_name.trim(),
      last_name:            form.last_name.trim(),
      company_type:         form.owner_type === 'company' ? form.company_type.trim() : null,
      phone:                form.phone.trim(),
      email:                form.email.trim(),
      registration_date:    form.registration_date || null,
      id_number:            form.id_number.trim(),
      country:              form.country.trim(),
      city:                 form.city.trim(),
      postal_address:       form.postal_address.trim(),
      physical_address:     form.physical_address.trim(),
      residential_address:  form.residential_address.trim(),
    }
    if (form.password) trimmed.password = form.password
    setSaving(true); setError('')
    try {
      const url = ownerId ? `${API}/landlords/${ownerId}` : `${API}/landlords`
      const method = ownerId ? 'PUT' : 'POST'
      const body = ownerId ? trimmed : { ...trimmed, status: 1 }
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) })
      if (!res.ok) throw new Error()

      if (!ownerId) {
        const created = await res.json()
        const staged = pendingDocs.filter(d => d.type && d.file)
        for (const d of staged) {
          if (d.file) await uploadOne(created.id, d.type, d.file)
        }
      }

      router.push('/dashboard/owners')
    } catch { setError(ownerId ? 'Failed to update owner' : 'Failed to create owner') }
    finally { setSaving(false) }
  }

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>{ownerId ? 'Edit Owner' : 'Add Owner'}</h1>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/owners')}>← Back to Owners</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 900 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="af-modal-form">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="af-field">
                <label>Owner Type<span style={{ color: '#f87171' }}> *</span></label>
                <select className="af-select" value={form.owner_type} onChange={e => setField('owner_type', e.target.value)}>
                  <option value="individual">Individual</option>
                  <option value="company">Company</option>
                </select>
              </div>
              <div className="af-field">
                <label>{form.owner_type === 'company' ? 'Company Name' : 'First Name'}<span style={{ color: '#f87171' }}> *</span></label>
                <input type="text" value={form.first_name} onChange={e => setField('first_name', e.target.value)} placeholder="First Name" />
              </div>

              <div className="af-field">
                <label>{form.owner_type === 'company' ? 'Company Type' : 'Middle Name'}</label>
                {form.owner_type === 'company' ? (
                  <input type="text" value={form.company_type} onChange={e => setField('company_type', e.target.value)} placeholder="Corporation, LLC…" />
                ) : (
                  <input type="text" value={form.middle_name} onChange={e => setField('middle_name', e.target.value)} placeholder="Middle Name" />
                )}
              </div>
              <div className="af-field">
                <label>Last Name{form.owner_type !== 'company' && <span style={{ color: '#f87171' }}> *</span>}</label>
                <input type="text" value={form.last_name} onChange={e => setField('last_name', e.target.value)} placeholder="Last Name" disabled={form.owner_type === 'company'} />
              </div>

              <div className="af-field">
                <label>{form.owner_type === 'company' ? 'Company Email' : 'Email'}<span style={{ color: '#f87171' }}> *</span></label>
                <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="Email" />
              </div>
              <div className="af-field">
                <label>{form.owner_type === 'company' ? 'Company Contact' : 'Phone Number'}<span style={{ color: '#f87171' }}> *</span></label>
                <input type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="Phone Number" />
              </div>

              <div className="af-field">
                <label>Registration Date</label>
                <DatePicker value={form.registration_date} onChange={v => setField('registration_date', v)} placeholder="MM-DD-YYYY" />
              </div>
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
                <label>City</label>
                <input type="text" value={form.city} onChange={e => setField('city', e.target.value)} placeholder="City" />
              </div>
              <div className="af-field">
                <label>National ID or Passport</label>
                <input type="text" value={form.id_number} onChange={e => setField('id_number', e.target.value)} placeholder="National ID or Passport" />
              </div>

              <div className="af-field">
                <label>Postal Address</label>
                <input type="text" value={form.postal_address} onChange={e => setField('postal_address', e.target.value)} placeholder="Postal Address" />
              </div>
              <div className="af-field">
                <label>Physical Address</label>
                <input type="text" value={form.physical_address} onChange={e => setField('physical_address', e.target.value)} placeholder="Physical Address" />
              </div>

              <div className="af-field">
                <label>Residential Address</label>
                <input type="text" value={form.residential_address} onChange={e => setField('residential_address', e.target.value)} placeholder="Residential Address" />
              </div>
              <div className="af-field">
                <label>Password{!ownerId && <span style={{ color: '#f87171' }}> *</span>}</label>
                <input type="password" value={form.password} onChange={e => setField('password', e.target.value)} placeholder="Password" />
              </div>

              <div className="af-field">
                <label>Confirm Password{!ownerId && <span style={{ color: '#f87171' }}> *</span>}</label>
                <input type="password" value={form.confirm_password} onChange={e => setField('confirm_password', e.target.value)} placeholder="Confirm Password" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="af-auth-submit" style={{ flex: 1, opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving}>
                {saving ? 'Saving…' : ownerId ? 'Save Changes' : 'Add Owner'}
              </button>
              <button
                className="af-btn-secondary"
                style={{ flex: 1 }}
                onClick={() => router.push('/dashboard/owners')}
                disabled={saving}
              >
                Cancel
              </button>
            </div>

          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Documents</div>

            {!ownerId ? (
              <>
                {pendingDocs.map((row, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <select className="af-select" value={row.type} onChange={e => setPendingDoc(i, { type: e.target.value })} style={{ flex: '1 1 140px' }}>
                      <option value="">-- Select Type --</option>
                      {docTypes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <div style={{ flex: '1 1 160px' }}>
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
                  <div style={{ flex: '1 1 160px' }}>
                    <FileDropInput value={newDocFile} onChange={setNewDocFile} placeholder="Choose a document or drag it here" />
                  </div>
                  <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={uploadDoc} disabled={uploading || !newDocType || !newDocFile}>
                    {uploading ? 'Uploading…' : 'Upload'}
                  </button>
                </div>
                {docs.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>No documents uploaded</div>
                ) : (
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
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
