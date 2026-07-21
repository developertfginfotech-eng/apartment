'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import FileDropInput from '@/components/FileDropInput'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Doc { id: number; document_type: number; document: string; document_type_name: string }
interface DocType { id: number; name: string }

type FormState = {
  renter_type: string
  first_name: string
  middle_name: string
  last_name: string
  company_type: string
  email: string
  contact: string
  national_id: string
  address: string
  password: string
  renter_status: string
}

const EMPTY_FORM: FormState = {
  renter_type: 'individual',
  first_name: '',
  middle_name: '',
  last_name: '',
  company_type: '',
  email: '',
  contact: '',
  national_id: '',
  address: '',
  password: '',
  renter_status: '1',
}

const isImage = (url: string) => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url)

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

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null)

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
          renter_type:   r.renter_type ?? 'individual',
          first_name:    r.first_name ?? '',
          middle_name:   r.middle_name ?? '',
          last_name:     r.last_name ?? '',
          company_type:  r.company_type ?? '',
          email:         r.email ?? '',
          contact:       r.contact ?? '',
          national_id:   r.national_id ?? '',
          address:       r.address ?? '',
          password:      '',
          renter_status: String(r.renter_status),
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

  const changePassword = async () => {
    if (!renterId || !newPassword || newPassword !== confirmPassword) return
    setChangingPassword(true)
    setPasswordMsg(null)
    try {
      const res = await fetch(`${API}/renters/${renterId}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ password: newPassword }) })
      if (!res.ok) throw new Error()
      setPasswordMsg('Password updated')
      setNewPassword(''); setConfirmPassword('')
    } catch {
      setPasswordMsg('Failed to update password')
    } finally {
      setChangingPassword(false)
    }
  }

  const save = async () => {
    if (!form.first_name || !form.email) return
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        renter_type:  form.renter_type,
        first_name:   form.first_name,
        middle_name:  form.renter_type === 'company' ? null : form.middle_name,
        last_name:    form.renter_type === 'company' ? null : form.last_name,
        company_type: form.renter_type === 'company' ? form.company_type : null,
        email:        form.email,
        contact:      form.contact,
        national_id:  form.national_id,
        address:      form.address,
        renter_status: Number(form.renter_status),
      }
      if (!renterId) body.password = form.password
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

  const isCompany = form.renter_type === 'company'

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>{renterId ? 'Edit Tenant' : 'Add Tenant'}</h1>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/tenants')}>← Back to Tenants</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: renterId ? '1fr 1fr' : '1fr', gap: 24, alignItems: 'start', maxWidth: 1000 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 750, marginBottom: 18 }}>Contact Information</div>
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
                <label>{isCompany ? 'Company Name' : 'First Name'}</label>
                <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="John" />
              </div>
              {isCompany ? (
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
            {!isCompany && (
              <div className="af-field">
                <label>Middle Name</label>
                <input value={form.middle_name} onChange={e => setForm(f => ({ ...f, middle_name: e.target.value }))} placeholder="Name" />
              </div>
            )}
            <div className="af-field">
              <label>{isCompany ? 'Company Email' : 'Email'}</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" />
            </div>
            <div className="af-field">
              <label>{isCompany ? 'Company Contact' : 'Contact'}</label>
              <input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="+1 555-0100" />
            </div>
            <div className="af-field">
              <label>NID(National ID)</label>
              <input value={form.national_id} onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))} placeholder="NID(National ID)" />
            </div>
            <div className="af-field">
              <label>Address</label>
              <textarea className="af-select" rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Address" />
            </div>
            {!renterId && (
              <div className="af-field">
                <label>Password</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Password" />
              </div>
            )}
            <div className="af-field">
              <label>Status</label>
              <select className="af-select" value={form.renter_status} onChange={e => setForm(f => ({ ...f, renter_status: e.target.value }))}>
                <option value="1">Active</option>
                <option value="0">Expired</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/tenants')} disabled={saving}>
                Cancel
              </button>
              <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save} disabled={saving}>
                {saving ? 'Saving…' : renterId ? 'Update' : 'Add tenant'}
              </button>
            </div>
          </div>
        </div>

        {renterId && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 750, marginBottom: 18 }}>Change Password</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="af-field">
                  <label>Password</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Password" />
                </div>
                <div className="af-field">
                  <label>Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm Password" />
                </div>
              </div>
              {passwordMsg && <div style={{ fontSize: 12.5, color: passwordMsg.includes('Failed') ? '#ef4444' : '#22c55e', marginTop: 8 }}>{passwordMsg}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <button
                  className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }}
                  onClick={changePassword}
                  disabled={changingPassword || !newPassword || newPassword !== confirmPassword}
                >
                  {changingPassword ? 'Changing…' : 'Change'}
                </button>
              </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 750, marginBottom: 18 }}>Documents</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <select className="af-select" value={newDocType} onChange={e => setNewDocType(e.target.value)} style={{ flex: '1 1 140px' }}>
                  <option value="">-- Select Type --</option>
                  {docTypes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <div style={{ flex: '1 1 160px' }}>
                  <FileDropInput value={newDocFile} onChange={setNewDocFile} placeholder="Choose a document or drag it here" />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={uploadDoc} disabled={uploading || !newDocType || !newDocFile}>
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </div>

            {docs.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24 }}>
                <div style={{ fontSize: 15, fontWeight: 750, marginBottom: 18 }}>Uploaded Documents</div>
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
          </div>
        )}
      </div>
    </main>
  )
}
