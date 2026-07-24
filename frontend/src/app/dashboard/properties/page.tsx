'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Pagination, { usePagination } from '@/components/Pagination'
import ToggleSwitch from '@/components/ToggleSwitch'

interface Property {
  id: number
  landlord_id: number | null
  owner_name: string | null
  property_type: string
  property_name: string
  property_code: string
  ownership_percentage: string
  address: string
  status: number
  total_floor: number
  total_unit: number
  total_renter: number
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
})

export default function PropertiesPage() {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [search, setSearch]         = useState('')

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
    p.address?.toLowerCase().includes(search.toLowerCase())
  )
  const { page, setPage, pageSize, pageItems } = usePagination(filtered, 10)

  const toggleStatus = async (p: Property) => {
    const newStatus = p.status === 1 ? 0 : 1
    setProperties(ps => ps.map(x => x.id === p.id ? { ...x, status: newStatus } : x))
    try {
      const res = await fetch(`${API}/properties/${p.id}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ status: newStatus }) })
      if (!res.ok) throw new Error()
    } catch {
      setProperties(ps => ps.map(x => x.id === p.id ? { ...x, status: p.status } : x))
      setError('Failed to update status')
    }
  }

  const del = async (id: number) => {
    if (!confirm('Delete this property?')) return
    setError(null)
    try {
      const res = await fetch(`${API}/properties/${id}`, { method: 'DELETE', headers: headers() })
      if (res.status === 401) { router.push('/login'); return }
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      await fetchProperties()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const activeCount = properties.filter(p => p.status === 1).length
  const fmt = (v: string | number) => `₱ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const exportHeaders = ['#', 'Name', 'Code', 'Location', 'No Floor', 'No Unit', 'No Renter', 'Enable/Disable']
  const exportRows = () => filtered.map((p, i) => [
    i + 1, p.property_name, p.property_code, p.address, p.total_floor, p.total_unit, p.total_renter,
    p.status === 1 ? 'Enabled' : 'Disabled',
  ])
  const exportExcel = () => {
    const csv = [exportHeaders, ...exportRows()].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'properties.csv' })
    a.click()
  }
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Properties List', 14, 14)
    autoTable(doc, {
      head: [exportHeaders],
      body: exportRows().map(r => r.map(String)),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    })
    doc.save('properties.pdf')
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Properties</h1>
          <p className="af-db-subtitle">
            {loading ? 'Loading…' : `${properties.length} total · ${activeCount} active`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Export To Excel
          </button>
          <button onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Export To Pdf
          </button>
          <button className="af-btn-primary" onClick={() => router.push('/dashboard/properties/new')} style={{ cursor: 'pointer', border: 'none' }} disabled={loading}>
            + Add Property
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <input className="af-prop-search" placeholder="Search by name, code, or address…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '48px 0' }}>Loading properties…</div>
      ) : (
        <div className="af-prop-table-wrap">
          <table className="af-prop-table">
            <thead>
              <tr>
                <th>#</th><th>Name</th><th>Code</th><th>Location</th>
                <th>No Floor</th><th>No Unit</th><th>No Renter</th><th>Enable/Disable</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px' }}>No properties found</td></tr>
              )}
              {pageItems.map((p, i) => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{(page - 1) * pageSize + i + 1}</td>
                  <td style={{ fontWeight: 650 }}>{p.property_name}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{p.property_code}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{p.address || '—'}</td>
                  <td>{p.total_floor}</td>
                  <td>{p.total_unit}</td>
                  <td>{p.total_renter}</td>
                  <td>
                    <ToggleSwitch checked={p.status === 1} onChange={() => toggleStatus(p)} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="af-prop-act edit" title="View" onClick={() => router.push(`/dashboard/properties/view?id=${p.id}`)}>👁</button>
                      <button className="af-prop-act edit" title="Edit" onClick={() => router.push(`/dashboard/properties/edit?id=${p.id}`)}>✏️</button>
                      <button className="af-prop-act del" title="Delete" onClick={() => del(p.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />
        </div>
      )}

    </main>
  )
}
