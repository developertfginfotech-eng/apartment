'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Pagination, { usePagination } from '@/components/Pagination'
import { formatDate } from '@/lib/date'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Vendor {
  id: number
  name: string | null
  address: string | null
  tin: string | null
  phone: string | null
  email: string | null
  status: number
  created_at: string
}

const EMPTY_FORM = { name: '', address: '', tin: '', phone: '', email: '' }

export default function VendorsPage() {
  const router = useRouter()

  const [vendors, setVendors] = useState<Vendor[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Vendor | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!localStorage.getItem('apt_token')) router.push('/login')
  }, [router])

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const fetchVendors = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`${API}/vendors?${params}`, { headers: authHeaders() })
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      const data = await res.json()
      setVendors(Array.isArray(data) ? data : data.data ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load vendors')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchVendors() }, [fetchVendors])

  const { page, setPage, pageSize, pageItems } = usePagination(vendors, 10)

  const openCreate = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (v: Vendor) => {
    setEditTarget(v)
    setForm({
      name: v.name ?? '',
      address: v.address ?? '',
      tin: v.tin ?? '',
      phone: v.phone ?? '',
      email: v.email ?? '',
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditTarget(null)
    setForm(EMPTY_FORM)
  }

  const saveVendor = async () => {
    if (!form.name) return
    setSaving(true)
    setError('')
    try {
      const url = editTarget ? `${API}/vendors/${editTarget.id}` : `${API}/vendors`
      const method = editTarget ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(form) })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      closeForm()
      await fetchVendors()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save vendor')
    } finally {
      setSaving(false)
    }
  }

  const deleteVendor = async (id: number) => {
    if (!confirm('Delete this vendor?')) return
    setError('')
    try {
      const res = await fetch(`${API}/vendors/${id}`, { method: 'DELETE', headers: authHeaders() })
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
      await fetchVendors()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete vendor')
    }
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Vendors</h1>
          <p className="af-db-subtitle">{loading ? 'Loading…' : `${vendors.length} vendor${vendors.length !== 1 ? 's' : ''}`}</p>
        </div>
        <button className="af-btn-primary" onClick={openCreate} style={{ cursor: 'pointer', border: 'none' }}>+ New Vendor</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name…"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', width: 260 }}/>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 18, color: '#ef4444', fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
          Loading vendors…
        </div>
      ) : vendors.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
          No vendors found.
        </div>
      ) : (
        <div className="af-prop-table-wrap" style={{ overflowX: 'auto' }}>
          <table className="af-prop-table" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Address</th>
                <th>TIN</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Added</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(v => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 650 }}>{v.name || '—'}</td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>{v.address || '—'}</td>
                  <td style={{ fontSize: 13 }}>{v.tin || '—'}</td>
                  <td style={{ fontSize: 13 }}>{v.phone || '—'}</td>
                  <td style={{ fontSize: 13 }}>{v.email || '—'}</td>
                  <td style={{ fontSize: 13 }}>{formatDate(v.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="af-prop-act edit" onClick={() => openEdit(v)}>Edit</button>
                      <button className="af-prop-act delete" onClick={() => deleteVendor(v.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageSize={pageSize} totalItems={vendors.length} onPageChange={setPage} />
        </div>
      )}

      {showForm && (
        <div className="af-modal-overlay" onClick={closeForm}>
          <div className="af-modal af-modal-in" onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">{editTarget ? 'Edit Vendor' : 'New Vendor'}</h2>
            <div className="af-modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="af-field" style={{ gridColumn: 'span 2' }}>
                  <label>Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Vendor name" autoFocus/>
                </div>
                <div className="af-field" style={{ gridColumn: 'span 2' }}>
                  <label>Address</label>
                  <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Address"/>
                </div>
                <div className="af-field">
                  <label>TIN</label>
                  <input value={form.tin} onChange={e => setForm(f => ({ ...f, tin: e.target.value }))} placeholder="000-000-000-000"/>
                </div>
                <div className="af-field">
                  <label>Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number"/>
                </div>
                <div className="af-field" style={{ gridColumn: 'span 2' }}>
                  <label>Email</label>
                  <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="vendor@email.com"/>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={closeForm}>Cancel</button>
              <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={saveVendor} disabled={saving}>
                {saving ? 'Saving…' : editTarget ? 'Save changes' : 'Create vendor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
