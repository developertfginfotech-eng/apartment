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

interface Floor { id: number; name: string; area: number; units: Unit[] }
interface Unit { id: number; floor_id: number; name: string; area: number }
interface Doc { id: number; document_type: number; document: string; document_type_name: string }
interface ViewRenter { id: number; name: string; contact: string | null; email: string | null; floor_name: string | null; unit_name: string | null }
interface Financial { pay_amount: string | number; expenses: string | number; owner_maintenance: string | number; renter_maintenance: string | number; deposit: string | number }
interface PropertyDetail extends Property { floors: Floor[]; documents: Doc[]; renters: ViewRenter[]; financial: Financial }

const VIEW_TABS = ['Info', 'Renters', 'Floors', 'Units', 'Financial Report', 'Documents'] as const
type ViewTab = typeof VIEW_TABS[number]

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

  const [viewing, setViewing]   = useState<PropertyDetail | null>(null)
  const [viewTab, setViewTab]   = useState<ViewTab>('Info')
  const [viewLoading, setViewLoading] = useState(false)

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

  const openView = async (p: Property) => {
    setViewTab('Info')
    setViewLoading(true)
    try {
      const res = await fetch(`${API}/properties/${p.id}`, { headers: headers() })
      const data = await res.json()
      setViewing(data)
    } catch {
      setError('Failed to load property details')
    } finally {
      setViewLoading(false)
    }
  }

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
                <th>Property Name</th><th>Code</th><th>Owner</th><th>Type</th>
                <th>Floors</th><th>Units</th><th>Renters</th><th>Enable/Disable</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px' }}>No properties found</td></tr>
              )}
              {pageItems.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 650 }}>{p.property_name}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{p.property_code}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{p.owner_name?.trim() || '—'}</td>
                  <td><span className="af-prop-badge type">{p.property_type}</span></td>
                  <td>{p.total_floor}</td>
                  <td>{p.total_unit}</td>
                  <td>{p.total_renter}</td>
                  <td>
                    <ToggleSwitch checked={p.status === 1} onChange={() => toggleStatus(p)} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="af-prop-act edit" title="View" onClick={() => openView(p)}>👁</button>
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

      {/* View Property Details */}
      {viewing && (
        <div className="af-modal-overlay" onClick={() => setViewing(null)}>
          <div className="af-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="af-modal-title">Property Details</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: -14, marginBottom: 16 }}>
              {viewing.property_name} {viewing.property_code}
            </p>

            <div className="af-tab-bar" style={{ marginBottom: 18 }}>
              {VIEW_TABS.map(t => (
                <button key={t} onClick={() => setViewTab(t)} className={`af-tab-pill ${viewTab === t ? 'active' : ''}`}>{t}</button>
              ))}
            </div>

            {viewLoading ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>Loading…</div>
            ) : (
              <>
                {viewTab === 'Info' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {([
                      ['Owner', viewing.owner_name?.trim() || '—'],
                      ['Ownership %', `${viewing.ownership_percentage ?? 0}%`],
                      ['Property Type', viewing.property_type],
                      ['Property Name', viewing.property_name],
                      ['Property Code', viewing.property_code],
                      ['Location', viewing.address],
                      ['Status', viewing.status === 1 ? 'Active' : 'Inactive'],
                    ] as [string, string][]).map(([k, v]) => (
                      <div key={k} style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px' }}>
                        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}

                {viewTab === 'Renters' && (
                  <div className="af-prop-table-wrap">
                    <table className="af-prop-table">
                      <thead><tr><th>Name</th><th>Contact</th><th>Email</th><th>Floor</th><th>Unit</th></tr></thead>
                      <tbody>
                        {viewing.renters.length === 0 ? (
                          <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No renters found</td></tr>
                        ) : viewing.renters.map(r => (
                          <tr key={r.id}>
                            <td style={{ fontWeight: 600 }}>{r.name?.trim() || '—'}</td>
                            <td style={{ fontSize: 13 }}>{r.contact || '—'}</td>
                            <td style={{ fontSize: 13 }}>{r.email || '—'}</td>
                            <td style={{ fontSize: 13 }}>{r.floor_name || '—'}</td>
                            <td style={{ fontSize: 13 }}>{r.unit_name || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {viewTab === 'Floors' && (
                  <div className="af-prop-table-wrap">
                    <table className="af-prop-table">
                      <thead><tr><th>Floor</th><th>Area (m²)</th><th>Units</th></tr></thead>
                      <tbody>
                        {viewing.floors.length === 0 ? (
                          <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No floors found</td></tr>
                        ) : viewing.floors.map(f => (
                          <tr key={f.id}>
                            <td style={{ fontWeight: 600 }}>{f.name}</td>
                            <td style={{ fontSize: 13 }}>{f.area}</td>
                            <td style={{ fontSize: 13 }}>{f.units.length}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {viewTab === 'Units' && (
                  <div className="af-prop-table-wrap">
                    <table className="af-prop-table">
                      <thead><tr><th>Unit</th><th>Floor</th><th>Area (m²)</th></tr></thead>
                      <tbody>
                        {viewing.floors.flatMap(f => f.units).length === 0 ? (
                          <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No units found</td></tr>
                        ) : viewing.floors.flatMap(f => f.units.map(u => (
                          <tr key={u.id}>
                            <td style={{ fontWeight: 600 }}>{u.name}</td>
                            <td style={{ fontSize: 13 }}>{f.name}</td>
                            <td style={{ fontSize: 13 }}>{u.area}</td>
                          </tr>
                        )))}
                      </tbody>
                    </table>
                  </div>
                )}

                {viewTab === 'Financial Report' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {([
                      ['Rent Collected', fmt(viewing.financial.pay_amount)],
                      ['Expenses', fmt(viewing.financial.expenses)],
                      ['Owner Maintenance', fmt(viewing.financial.owner_maintenance)],
                      ['Renter Maintenance', fmt(viewing.financial.renter_maintenance)],
                      ['Deposits', fmt(viewing.financial.deposit)],
                    ] as [string, string][]).map(([k, v]) => (
                      <div key={k} style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px' }}>
                        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}

                {viewTab === 'Documents' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {viewing.documents.length === 0 ? (
                      <div style={{ color: 'var(--muted)', fontSize: 13 }}>No documents uploaded</div>
                    ) : viewing.documents.map(d => (
                      <a key={d.id} href={`${API}${d.document}`} target="_blank" rel="noreferrer"
                        style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--accent)' }}>
                        {d.document_type_name ?? 'Document'}
                      </a>
                    ))}
                  </div>
                )}
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
