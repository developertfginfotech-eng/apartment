'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Property {
  id: number
  landlord_id: number | null
  property_type: string
  property_name: string
  property_code: string
  address: string
  status: number // 1 = active, 0 = inactive
}

type FormState = {
  property_name: string
  property_code: string
  property_type: string
  address: string
  status: number
}

const EMPTY_FORM: FormState = {
  property_name: '',
  property_code: '',
  property_type: 'Apartment',
  address: '',
  status: 1,
}

const API = 'http://localhost:3000'
const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
})

export default function PropertiesPage() {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState<Property | null>(null)
  const [saving, setSaving]         = useState(false)
  const [search, setSearch]         = useState('')
  const [form, setForm]             = useState<FormState>(EMPTY_FORM)

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

  const filtered = properties.filter(p =>
    p.property_name.toLowerCase().includes(search.toLowerCase()) ||
    p.property_code.toLowerCase().includes(search.toLowerCase()) ||
    p.address.toLowerCase().includes(search.toLowerCase())
  )

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (p: Property) => {
    setEditing(p)
    setForm({
      property_name: p.property_name,
      property_code: p.property_code,
      property_type: p.property_type,
      address: p.address,
      status: p.status,
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.property_name.trim() || !form.address.trim()) return
    setSaving(true)
    setError(null)
    try {
      const url    = editing ? `${API}/properties/${editing.id}` : `${API}/properties`
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: headers(),
        body: JSON.stringify(form),
      })
      if (res.status === 401) { router.push('/login'); return }
      if (!res.ok) throw new Error(`Save failed (${res.status})`)
      setShowForm(false)
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
      const res = await fetch(`${API}/properties/${id}`, {
        method: 'DELETE',
        headers: headers(),
      })
      if (res.status === 401) { router.push('/login'); return }
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      await fetchProperties()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const activeCount = properties.filter(p => p.status === 1).length

  return (
    <main className="af-db-main">
      {/* Header */}
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Properties</h1>
          <p className="af-db-subtitle">
            {loading ? 'Loading…' : `${properties.length} total · ${activeCount} active`}
          </p>
        </div>
        <button
          className="af-btn-primary"
          onClick={openNew}
          style={{ cursor: 'pointer', border: 'none' }}
          disabled={loading}
        >
          + Add Property
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          background: 'var(--danger, #fee2e2)',
          color: 'var(--danger-text, #991b1b)',
          padding: '10px 16px',
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          className="af-prop-search"
          placeholder="Search by name, code, or address…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Loading state */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '48px 0' }}>
          Loading properties…
        </div>
      ) : (
        <div className="af-prop-table-wrap">
          <table className="af-prop-table">
            <thead>
              <tr>
                <th>Property Name</th>
                <th>Code</th>
                <th>Type</th>
                <th>Address</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px' }}>
                    No properties found
                  </td>
                </tr>
              )}
              {filtered.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 650 }}>{p.property_name}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{p.property_code}</td>
                  <td><span className="af-prop-badge type">{p.property_type}</span></td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{p.address}</td>
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

      {/* Modal */}
      {showForm && (
        <div className="af-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="af-modal" onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">{editing ? 'Edit Property' : 'Add Property'}</h2>
            <div className="af-modal-form">
              <div className="af-field">
                <label>Property name</label>
                <input
                  value={form.property_name}
                  onChange={e => setForm(f => ({ ...f, property_name: e.target.value }))}
                  placeholder="Sunrise Towers"
                />
              </div>
              <div className="af-field">
                <label>Property code</label>
                <input
                  value={form.property_code}
                  onChange={e => setForm(f => ({ ...f, property_code: e.target.value }))}
                  placeholder="PROP-001"
                />
              </div>
              <div className="af-field">
                <label>Type</label>
                <select
                  className="af-select"
                  value={form.property_type}
                  onChange={e => setForm(f => ({ ...f, property_type: e.target.value }))}
                >
                  {['Apartment', 'Residential', 'Commercial', 'Mixed Use'].map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="af-field">
                <label>Address</label>
                <input
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="12 Park Ave, New York"
                />
              </div>
              <div className="af-field">
                <label>Status</label>
                <select
                  className="af-select"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: Number(e.target.value) }))}
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>
            </div>
            {error && (
              <p style={{ color: 'var(--danger-text, #991b1b)', fontSize: 13, marginTop: 8 }}>
                {error}
              </p>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button
                className="af-btn-secondary"
                style={{ cursor: 'pointer' }}
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="af-auth-submit"
                style={{ width: 'auto', padding: '10px 24px' }}
                onClick={save}
                disabled={saving}
              >
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Add property'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
