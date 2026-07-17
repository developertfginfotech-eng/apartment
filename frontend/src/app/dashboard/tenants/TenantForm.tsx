'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import FileDropInput from '@/components/FileDropInput'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

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

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
})

export default function TenantForm({ renterId }: { renterId?: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [docTypes, setDocTypes] = useState<DocType[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [newDocType, setNewDocType] = useState('')
  const [newDocFile, setNewDocFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(!!renterId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/document/types`, { headers: headers() }).then(r => r.json()).then(d => Array.isArray(d) && setDocTypes(d)).catch(() => {})
  }, [])

  const loadDocs = useCallback(async (id: number) => {
    const res = await fetch(`${API}/document/renter?renter_id=${id}`, { headers: headers() })
    setDocs(await res.json())
  }, [])

  useEffect(() => {
    if (!renterId) return
    (async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/renters/${renterId}`, { headers: headers() })
        const r = await res.json()
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
        await loadDocs(renterId)
      } catch {
        setError('Failed to load tenant')
      } finally {
        setLoading(false)
      }
    })()
  }, [renterId, loadDocs])

  const uploadDoc = async () => {
    if (!renterId || !newDocType || !newDocFile) return
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
        body: JSON.stringify({ renter_id: renterId, document_type: parseInt(newDocType, 10), document: url }),
      })
      setNewDocType(''); setNewDocFile(null)
      await loadDocs(renterId)
    } catch {
      setError('Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const removeDoc = async (id: number) => {
    if (!renterId) return
    await fetch(`${API}/document/renter/${id}`, { method: 'DELETE', headers: headers() })
    await loadDocs(renterId)
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
      const url    = renterId ? `${API}/renters/${renterId}` : `${API}/renters`
      const method = renterId ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers: headers(), body: JSON.stringify(body) })
      if (!res.ok) throw new Error(`Save failed (${res.status})`)
      router.push('/dashboard/tenants')
    } catch (err) {
      setError(err instanceof Error ? err.message : (renterId ? 'Failed to update tenant' : 'Failed to create tenant'))
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
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>{renterId ? 'Edit Tenant' : 'Add Tenant'}</h1>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/tenants')}>← Back to Tenants</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 900 }}>
        <div style={{ display: 'grid', gridTemplateColumns: renterId ? '1fr 1fr' : '1fr', gap: 24 }}>
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

            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/tenants')} disabled={saving}>
                Cancel
              </button>
              <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save} disabled={saving}>
                {saving ? 'Saving…' : renterId ? 'Save changes' : 'Add tenant'}
              </button>
            </div>
          </div>

          {renterId && (
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
    </main>
  )
}
