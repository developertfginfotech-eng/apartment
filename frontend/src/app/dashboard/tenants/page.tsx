'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Pagination, { usePagination } from '@/components/Pagination'
import ToggleSwitch from '@/components/ToggleSwitch'
import { formatDate } from '@/lib/date'

interface Renter {
  id: number
  property_id: number
  property_name: string | null
  floor_name: string | null
  on_rent: string | null
  lease_start_date: string | null
  lease_end_date: string | null
  first_name: string
  middle_name: string | null
  last_name: string | null
  name: string
  renter_type: string | null
  company_type: string | null
  email: string
  contact: string
  national_id: string
  advance_rent: string
  rent_per_month: string
  issue_date: string
  address: string
  renter_status: number
  status: number
}

interface Doc { id: number; document_type: number; document: string; document_type_name: string }

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
})

const STATUS_LABEL: Record<number, string> = {
  1: 'active',
  0: 'expired',
}

const VIEW_TABS = ['Info', 'Documents'] as const
type ViewTab = typeof VIEW_TABS[number]

export default function TenantsPage() {
  const router = useRouter()
  const [renters, setRenters]     = useState<Renter[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState<'all' | 'active' | 'inactive'>('all')
  const [error, setError]         = useState<string | null>(null)

  const [viewing, setViewing]     = useState<Renter | null>(null)
  const [viewTab, setViewTab]     = useState<ViewTab>('Info')
  const [viewDocs, setViewDocs]   = useState<Doc[]>([])
  const [viewLoading, setViewLoading] = useState(false)

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
  const { page, setPage, pageSize, pageItems } = usePagination(filtered, 10)

  const counts = {
    active:   renters.filter(r => r.renter_status === 1).length,
    inactive: renters.filter(r => r.renter_status === 0).length,
  }

  const openView = async (r: Renter) => {
    setViewTab('Info')
    setViewing(r)
    setViewLoading(true)
    try {
      const res = await fetch(`${API}/document/renter?renter_id=${r.id}`, { headers: headers() })
      setViewDocs(await res.json())
    } catch {
      setViewDocs([])
    } finally {
      setViewLoading(false)
    }
  }

  const toggleEnabled = async (r: Renter) => {
    const newStatus = r.status === 1 ? 0 : 1
    setRenters(rs => rs.map(x => x.id === r.id ? { ...x, status: newStatus } : x))
    try {
      const res = await fetch(`${API}/renters/${r.id}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ status: newStatus }) })
      if (!res.ok) throw new Error()
    } catch {
      setRenters(rs => rs.map(x => x.id === r.id ? { ...x, status: r.status } : x))
      setError('Failed to update status')
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

  const exportHeaders = ['#', 'Name', 'Type', 'Contact', 'Property Name', 'Floor', 'On Rent', 'Advance Rent', 'Rent Per Month', 'Enable/Disable']
  const exportRows = () => filtered.map((r, i) => [
    i + 1, r.name || '—', r.renter_type ?? 'individual', r.contact, r.property_name || '—', r.floor_name || '—',
    r.on_rent || '—', r.advance_rent, r.rent_per_month, r.status === 1 ? 'Enabled' : 'Disabled',
  ])
  const exportExcel = () => {
    const csv = [exportHeaders, ...exportRows()].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'renters.csv' })
    a.click()
  }
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Renters List', 14, 14)
    autoTable(doc, {
      head: [exportHeaders],
      body: exportRows().map(r => r.map(String)),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    })
    doc.save('renters.pdf')
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Tenants</h1>
          <p className="af-db-subtitle">
            {renters.length} total · {counts.active} active · {counts.inactive} expired
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Export To Excel
          </button>
          <button onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↓ Export To Pdf
          </button>
          <button className="af-btn-primary" onClick={() => router.push('/dashboard/tenants/new')} style={{ cursor: 'pointer', border: 'none' }}>
            + Add Tenant
          </button>
        </div>
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
                : `${s === 'active' ? 'Active' : 'Expired'} (${counts[s as keyof typeof counts]})`}
            </button>
          ))}
        </div>
      </div>

      <div className="af-prop-table-wrap" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 48, fontSize: 14 }}>
            Loading tenants…
          </div>
        ) : (
          <table className="af-prop-table" style={{ minWidth: 1100 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Type</th>
                <th>Contact</th>
                <th>Property Name</th>
                <th>Floor</th>
                <th>On Rent</th>
                <th>Advance Rent</th>
                <th>Rent Per Month</th>
                <th>Enable/Disable</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>
                    No tenants found
                  </td>
                </tr>
              )}
              {pageItems.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ color: 'var(--muted)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{(page - 1) * pageSize + i + 1}</td>
                  <td>
                    <div style={{ fontWeight: 650 }}>{r.name || '—'}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{r.email}</div>
                  </td>
                  <td>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100,
                      background: r.renter_type === 'company' ? 'rgba(59,130,246,0.12)' : 'rgba(168,85,247,0.12)',
                      color: r.renter_type === 'company' ? '#60a5fa' : '#c084fc',
                    }}>
                      {r.renter_type ?? 'individual'}
                    </span>
                  </td>
                  <td style={{ fontSize: 13 }}>{r.contact}</td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>{r.property_name || '—'}</td>
                  <td style={{ fontSize: 13 }}>{r.floor_name || '—'}</td>
                  <td style={{ fontSize: 13 }}>{r.on_rent || '—'}</td>
                  <td style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{r.advance_rent}</td>
                  <td style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{r.rent_per_month}</td>
                  <td>
                    <ToggleSwitch checked={r.status === 1} onChange={() => toggleEnabled(r)} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="af-prop-act edit" title="View" onClick={() => openView(r)} style={{ cursor: 'pointer' }}>👁</button>
                      <button className="af-prop-act edit" title="Edit" onClick={() => router.push(`/dashboard/tenants/edit?id=${r.id}`)} style={{ cursor: 'pointer' }}>✏️</button>
                      <button className="af-prop-act del" title="Delete" onClick={() => del(r.id)} style={{ cursor: 'pointer' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!loading && <Pagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />}

      {/* View Renter Details */}
      {viewing && (
        <div className="af-modal-overlay" onClick={() => setViewing(null)}>
          <div className="af-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 650, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="af-modal-title">Renter Details</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: -14, marginBottom: 16 }}>{viewing.name}</p>

            <div className="af-tab-bar" style={{ marginBottom: 18 }}>
              {VIEW_TABS.map(t => (
                <button key={t} onClick={() => setViewTab(t)} className={`af-tab-pill ${viewTab === t ? 'active' : ''}`}>{t}</button>
              ))}
            </div>

            {viewTab === 'Info' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {([
                  ['Type', viewing.renter_type ?? 'individual'],
                  ['Company Type', viewing.company_type || '—'],
                  ['Name', viewing.name],
                  ['Email', viewing.email],
                  ['Contact', viewing.contact],
                  ['National ID', viewing.national_id || '—'],
                  ['Property', viewing.property_name || '—'],
                  ['Floor', viewing.floor_name || '—'],
                  ['On Rent', viewing.on_rent || '—'],
                  ['Lease Start', formatDate(viewing.lease_start_date)],
                  ['Lease End', formatDate(viewing.lease_end_date)],
                  ['Advance Rent', viewing.advance_rent],
                  ['Rent Per Month', viewing.rent_per_month],
                  ['Issue Date', formatDate(viewing.issue_date)],
                  ['Address', viewing.address || '—'],
                  ['Status', STATUS_LABEL[viewing.renter_status] ?? 'unknown'],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
            )}

            {viewTab === 'Documents' && (
              viewLoading ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>Loading…</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {viewDocs.length === 0 ? (
                    <div style={{ color: 'var(--muted)', fontSize: 13 }}>No documents uploaded</div>
                  ) : viewDocs.map(d => (
                    <a key={d.id} href={`${API}${d.document}`} target="_blank" rel="noreferrer"
                      style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--accent)' }}>
                      {d.document_type_name ?? 'Document'}
                    </a>
                  ))}
                </div>
              )
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
