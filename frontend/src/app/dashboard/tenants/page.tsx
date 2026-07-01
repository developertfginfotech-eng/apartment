'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Renter {
  id: number
  property_id: number
  name: string
  email: string
  contact: string
  national_id: string
  rent_per_month: string
  advance_rent: string
  issue_date: string
  address: string
  renter_status: number
  status: number
}

type FormState = {
  property_id: string
  name: string
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
  name: '',
  email: '',
  contact: '',
  national_id: '',
  rent_per_month: '',
  advance_rent: '',
  issue_date: '',
  address: '',
  renter_status: '1',
}

const API = 'http://localhost:3000'
const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
})

const STATUS_COLORS: Record<number, string> = {
  1: 'rgba(34,197,94,0.12)',
  0: 'rgba(100,116,139,0.12)',
}
const STATUS_TEXT: Record<number, string> = {
  1: '#22c55e',
  0: '#64748b',
}
const STATUS_LABEL: Record<number, string> = {
  1: 'active',
  0: 'inactive',
}

export default function TenantsPage() {
  const router = useRouter()
  const [renters, setRenters]     = useState<Renter[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState<'all' | 'active' | 'inactive'>('all')
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<Renter | null>(null)
  const [form, setForm]           = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

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

  const counts = {
    active:   renters.filter(r => r.renter_status === 1).length,
    inactive: renters.filter(r => r.renter_status === 0).length,
  }

  const openNew  = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openEdit = (r: Renter) => {
    setEditing(r)
    setForm({
      property_id:    String(r.property_id),
      name:           r.name,
      email:          r.email,
      contact:        r.contact,
      national_id:    r.national_id,
      rent_per_month: r.rent_per_month,
      advance_rent:   r.advance_rent,
      issue_date:     r.issue_date ? r.issue_date.slice(0, 10) : '',
      address:        r.address,
      renter_status:  String(r.renter_status),
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.name || !form.email) return
    setSaving(true)
    setError(null)
    try {
      const body = {
        property_id:    Number(form.property_id) || 0,
        name:           form.name,
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

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Tenants</h1>
          <p className="af-db-subtitle">
            {renters.length} total · {counts.active} active · {counts.inactive} inactive
          </p>
        </div>
        <button className="af-btn-primary" onClick={openNew} style={{ cursor: 'pointer', border: 'none' }}>
          + Add Tenant
        </button>
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
                : `${s.charAt(0).toUpperCase() + s.slice(1)} (${counts[s as keyof typeof counts]})`}
            </button>
          ))}
        </div>
      </div>

      <div className="af-prop-table-wrap">
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 48, fontSize: 14 }}>
            Loading tenants…
          </div>
        ) : (
          <table className="af-prop-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Contact</th>
                <th>Rent / Month</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>
                    No tenants found
                  </td>
                </tr>
              )}
              {filtered.map(r => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 650 }}>{r.name}</div>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>{r.email}</td>
                  <td style={{ fontSize: 13 }}>{r.contact}</td>
                  <td style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{r.rent_per_month}</td>
                  <td>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100,
                      background: STATUS_COLORS[r.renter_status] ?? 'rgba(100,116,139,0.12)',
                      color:      STATUS_TEXT[r.renter_status]   ?? '#64748b',
                    }}>
                      {STATUS_LABEL[r.renter_status] ?? 'unknown'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="af-prop-act edit" onClick={() => openEdit(r)}>Edit</button>
                      <button className="af-prop-act del"  onClick={() => del(r.id)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="af-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="af-modal" onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">{editing ? 'Edit Tenant' : 'Add Tenant'}</h2>
            <div className="af-modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="af-field">
                  <label>Full name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" />
                </div>
                <div className="af-field">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" />
                </div>
                <div className="af-field">
                  <label>Contact</label>
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
                <div className="af-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Address</label>
                  <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St" />
                </div>
                <div className="af-field">
                  <label>Status</label>
                  <select value={form.renter_status} onChange={e => setForm(f => ({ ...f, renter_status: e.target.value }))}>
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </select>
                </div>
              </div>
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
        </div>
      )}
    </main>
  )
}
