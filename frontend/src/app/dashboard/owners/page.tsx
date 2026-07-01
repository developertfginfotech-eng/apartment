'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
  country: string | null
  city: string | null
  physical_address: string | null
  status: number // 1 = active, 0 = inactive
}

type FormState = {
  first_name: string
  middle_name: string
  last_name: string
  phone: string
  email: string
  country: string
  city: string
  physical_address: string
}

const BLANK_FORM: FormState = {
  first_name: '',
  middle_name: '',
  last_name: '',
  phone: '',
  email: '',
  country: '',
  city: '',
  physical_address: '',
}

export default function OwnersPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [owners, setOwners]         = useState<Owner[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState<Owner | null>(null)
  const [form, setForm]             = useState<FormState>(BLANK_FORM)
  const [saving, setSaving]         = useState(false)
  const [deleteId, setDeleteId]     = useState<number | null>(null)
  const [deleting, setDeleting]     = useState(false)
  const [error, setError]           = useState<string | null>(null)

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

  function openEdit(o: Owner) {
    setEditTarget(o)
    setForm({
      first_name:       o.first_name ?? '',
      middle_name:      o.middle_name ?? '',
      last_name:        o.last_name ?? '',
      phone:            o.phone ?? '',
      email:            o.email ?? '',
      country:          o.country ?? '',
      city:             o.city ?? '',
      physical_address: o.physical_address ?? '',
    })
    setModalOpen(true)
  }

  async function saveOwner() {
    const trimmed: FormState = {
      first_name:       form.first_name.trim(),
      middle_name:      form.middle_name.trim(),
      last_name:        form.last_name.trim(),
      phone:            form.phone.trim(),
      email:            form.email.trim(),
      country:          form.country.trim(),
      city:             form.city.trim(),
      physical_address: form.physical_address.trim(),
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

  return (
    <main className="af-db-main">

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 className="af-db-greeting">Owners</h1>
          <p className="af-db-subtitle">{owners.length} total owner{owners.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button className="af-btn-primary" onClick={openAdd}>+ Add Owner</button>
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
                <th>Address</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: '36px 0' }}>
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
                    <td style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.physical_address ?? '—'}
                    </td>
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
          <div className="af-modal" onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">{editTarget ? 'Edit Owner' : 'Add Owner'}</h2>
            <div className="af-modal-form">

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="af-field">
                  <label>First Name <span style={{ color: '#f87171' }}>*</span></label>
                  <input type="text" value={form.first_name} onChange={e => setField('first_name', e.target.value)} placeholder="First name" />
                </div>
                <div className="af-field">
                  <label>Last Name</label>
                  <input type="text" value={form.last_name} onChange={e => setField('last_name', e.target.value)} placeholder="Last name" />
                </div>
              </div>

              <div className="af-field">
                <label>Middle Name</label>
                <input type="text" value={form.middle_name} onChange={e => setField('middle_name', e.target.value)} placeholder="Middle name (optional)" />
              </div>

              <div className="af-field">
                <label>Phone</label>
                <input type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+1-555-0000" />
              </div>

              <div className="af-field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="email@example.com" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="af-field">
                  <label>Country</label>
                  <input type="text" value={form.country} onChange={e => setField('country', e.target.value)} placeholder="Country" />
                </div>
                <div className="af-field">
                  <label>City</label>
                  <input type="text" value={form.city} onChange={e => setField('city', e.target.value)} placeholder="City" />
                </div>
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

    </main>
  )
}
