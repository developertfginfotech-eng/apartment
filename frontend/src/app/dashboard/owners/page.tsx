'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Pagination, { usePagination } from '@/components/Pagination'
import ToggleSwitch from '@/components/ToggleSwitch'

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
  owner_type: string | null
  company_type: string | null
  registration_date: string | null
  id_number: string | null
  country: string | null
  country_name: string | null
  state: string | null
  city: string | null
  postal_address: string | null
  physical_address: string | null
  residential_address: string | null
  status: number // 1 = active, 0 = inactive
  total_property: number
  total_renter: number
}

export default function OwnersPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [owners, setOwners]         = useState<Owner[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
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
  const { page, setPage, pageSize, pageItems } = usePagination(filtered, 10)

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

  const exportHeaders = ['#', 'First Name', 'Last Name', 'Phone', 'Email', 'Owner Type', 'No Property', 'No Renter', 'Status']
  const exportRows = () => filtered.map((o, i) => [
    i + 1, o.first_name, o.last_name || '—', o.phone || '—', o.email || '—', o.owner_type || '—',
    o.total_property, o.total_renter, o.status === 1 ? 'Active' : 'Inactive',
  ])
  const exportExcel = () => {
    const csv = [exportHeaders, ...exportRows()].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'owners.csv' })
    a.click()
  }
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Property Owners List', 14, 14)
    autoTable(doc, {
      head: [exportHeaders],
      body: exportRows().map(r => r.map(String)),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    })
    doc.save('owners.pdf')
  }

  return (
    <main className="af-db-main">

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 className="af-db-greeting">Owners</h1>
          <p className="af-db-subtitle">{owners.length} total owner{owners.length !== 1 ? 's' : ''} registered</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Export To Excel
          </button>
          <button onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Export To Pdf
          </button>
          <button className="af-btn-primary" onClick={() => router.push('/dashboard/owners/new')}>+ Add Owner</button>
        </div>
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
                <th>First Name</th>
                <th>Last Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Owner Type</th>
                <th>No Property</th>
                <th>No Renter</th>
                <th>Enable/Disable</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)', padding: '36px 0' }}>
                    No owners found
                  </td>
                </tr>
              ) : (
                pageItems.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>{o.first_name}</td>
                    <td style={{ fontWeight: 600 }}>{o.last_name || '—'}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{o.phone ?? '—'}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{o.email ?? '—'}</td>
                    <td style={{ fontSize: 13 }}>{o.owner_type || '—'}</td>
                    <td style={{ fontSize: 13 }}>{o.total_property}</td>
                    <td style={{ fontSize: 13 }}>{o.total_renter}</td>
                    <td>
                      <ToggleSwitch checked={o.status === 1} onChange={() => toggleStatus(o)} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="af-prop-act edit" title="View" onClick={() => router.push(`/dashboard/owners/view?id=${o.id}`)} style={{ padding: '4px 10px', fontSize: 14, borderRadius: 7, border: 'none', cursor: 'pointer' }}>
                          👁
                        </button>
                        <button
                          className="af-prop-act edit"
                          title="Edit"
                          onClick={() => router.push(`/dashboard/owners/edit?id=${o.id}`)}
                          style={{ padding: '4px 10px', fontSize: 14, borderRadius: 7, border: 'none', cursor: 'pointer' }}
                        >
                          ✏️
                        </button>
                        <button
                          className="af-prop-act del"
                          title="Delete"
                          onClick={() => setDeleteId(o.id)}
                          style={{ padding: '4px 10px', fontSize: 14, borderRadius: 7, border: 'none', cursor: 'pointer' }}
                        >
                          🗑️
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
      {!loading && <Pagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />}

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
