'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Pagination, { usePagination } from '@/components/Pagination'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('apt_token')}` })

interface Floor { id: number; name: string; area: number; units: Unit[] }
interface Unit { id: number; floor_id: number; name: string; area: number }
interface Doc { id: number; document_type: number; document: string; document_type_name: string }
interface ViewRenter { id: number; name: string; contact: string | null; email: string | null }
interface Financial {
  pay_amount: string | number; expenses: string | number
  owner_maintenance: string | number; renter_maintenance: string | number
  profit: string | number; loss: string | number
}
interface PropertyDetail {
  id: number
  owner_name: string | null
  ownership_percentage: string | null
  property_type: string
  property_name: string
  property_code: string
  address: string
  status: number
  floors: Floor[]
  documents: Doc[]
  renters: ViewRenter[]
  financial: Financial
}

const VIEW_TABS = ['Info', 'Renters', 'Floors', 'Units', 'Financial Report', 'Documents'] as const
type ViewTab = typeof VIEW_TABS[number]

const isImage = (url: string) => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url)

function useTableSearch<T>(items: T[], filterFn: (item: T, q: string) => boolean) {
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const filtered = search ? items.filter(i => filterFn(i, search.toLowerCase())) : items
  const { page, setPage, pageItems } = usePagination(filtered, pageSize)
  return { search, setSearch, pageSize, setPageSize, page, setPage, filtered, pageItems }
}

function ListControls({ pageSize, setPageSize, search, setSearch, setPage }: {
  pageSize: number; setPageSize: (n: number) => void
  search: string; setSearch: (s: string) => void
  setPage: (p: number) => void
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
      <div className="af-field" style={{ margin: 0, minWidth: 90 }}>
        <label style={{ fontSize: 11.5 }}>Show</label>
        <select
          className="af-select"
          value={pageSize}
          onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
          style={{ padding: '8px 10px' }}
        >
          {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="af-field" style={{ margin: 0 }}>
        <label style={{ fontSize: 11.5 }}>Search</label>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search…"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', width: 220 }}
        />
      </div>
    </div>
  )
}

export default function PropertyView({ propertyId }: { propertyId: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [viewing, setViewing] = useState<PropertyDetail | null>(null)
  const [tab, setTab]         = useState<ViewTab>('Info')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  const fmt = (v: string | number) => `₱ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const loadDocs = async (id: number) => {
    const res = await fetch(`${API}/properties/${id}`, { headers: headers() })
    setViewing(await res.json())
  }

  useEffect(() => {
    (async () => {
      setLoading(true); setError('')
      try {
        const res = await fetch(`${API}/properties/${propertyId}`, { headers: headers() })
        if (!res.ok) throw new Error()
        setViewing(await res.json())
      } catch {
        setError('Failed to load property')
      } finally {
        setLoading(false)
      }
    })()
  }, [propertyId])

  const removeDoc = async (id: number) => {
    await fetch(`${API}/document/property/${id}`, { method: 'DELETE', headers: headers() })
    await loadDocs(propertyId)
  }

  const allUnits = (viewing?.floors ?? []).flatMap(f => f.units.map(u => ({ ...u, floor_name: f.name })))

  const floorsQ = useTableSearch(viewing?.floors ?? [], (f, q) => f.name.toLowerCase().includes(q))
  const unitsQ = useTableSearch(allUnits, (u, q) => u.name.toLowerCase().includes(q) || u.floor_name.toLowerCase().includes(q))
  const rentersQ = useTableSearch(viewing?.renters ?? [], (r, q) =>
    (r.name || '').toLowerCase().includes(q) || (r.contact || '').toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q))

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }
  if (error || !viewing) {
    return (
      <main className="af-db-main">
        <div style={{ color: '#ef4444', marginBottom: 16 }}>{error || 'Property not found'}</div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/properties')}>← Back to Properties</button>
      </main>
    )
  }

  const totalUnits = viewing.floors.reduce((n, f) => n + f.units.length, 0)
  const ownerLine = viewing.owner_name?.trim()
    ? `${viewing.owner_name.trim()} - ${Number(viewing.ownership_percentage ?? 0)}%`
    : 'No owners available.'

  return (
    <main className="af-db-main">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', maxWidth: 1000 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 820, letterSpacing: '-0.025em', marginBottom: 6 }}>Property Details</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>{viewing.property_name} {viewing.property_code}</p>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)', padding: 6, lineHeight: 1 }}
          >
            ⋮
          </button>
          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />
              <div style={{
                position: 'absolute', right: 0, top: '110%', zIndex: 10,
                background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 10,
                boxShadow: '0 12px 32px rgba(0,0,0,0.25)', minWidth: 170, overflow: 'hidden',
              }}>
                <button
                  onClick={() => router.push(`/dashboard/properties/edit?id=${viewing.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px',
                    background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 13, fontWeight: 600, color: 'var(--text)', textAlign: 'left',
                  }}
                >
                  ✏️ Edit Property
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 18, maxWidth: 1000, alignItems: 'start' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24 }}>
          <div className="af-tab-bar" style={{ marginBottom: 18 }}>
            {VIEW_TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} className={`af-tab-pill ${tab === t ? 'active' : ''}`}>{t}</button>
            ))}
          </div>

          {tab === 'Info' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px', gridColumn: '1/-1' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Owner and Ownership</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{ownerLine}</div>
              </div>
              {([
                ['Property Type', viewing.property_type],
                ['Property Name', viewing.property_name],
                ['Property Code', viewing.property_code],
                ['Location', viewing.address || '—'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, textTransform: k === 'Property Type' ? 'capitalize' : 'none' }}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'Renters' && (
            <>
              <ListControls pageSize={rentersQ.pageSize} setPageSize={rentersQ.setPageSize} search={rentersQ.search} setSearch={rentersQ.setSearch} setPage={rentersQ.setPage} />
              <div className="af-prop-table-wrap" style={{ overflowX: 'auto' }}>
                <table className="af-prop-table">
                  <thead><tr><th>#</th><th>Name</th><th>Contact</th><th>Email</th></tr></thead>
                  <tbody>
                    {rentersQ.filtered.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No renters found</td></tr>
                    ) : rentersQ.pageItems.map((r, i) => (
                      <tr key={r.id}>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{(rentersQ.page - 1) * rentersQ.pageSize + i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{r.name?.trim() || '—'}</td>
                        <td style={{ fontSize: 13 }}>{r.contact || '—'}</td>
                        <td style={{ fontSize: 13 }}>{r.email || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination page={rentersQ.page} pageSize={rentersQ.pageSize} totalItems={rentersQ.filtered.length} onPageChange={rentersQ.setPage} />
              </div>
            </>
          )}

          {tab === 'Floors' && (
            <>
              <ListControls pageSize={floorsQ.pageSize} setPageSize={floorsQ.setPageSize} search={floorsQ.search} setSearch={floorsQ.setSearch} setPage={floorsQ.setPage} />
              <div className="af-prop-table-wrap" style={{ overflowX: 'auto' }}>
                <table className="af-prop-table">
                  <thead><tr><th>#</th><th>Name</th><th>Area (m²)</th></tr></thead>
                  <tbody>
                    {floorsQ.filtered.length === 0 ? (
                      <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No floors found</td></tr>
                    ) : floorsQ.pageItems.map((f, i) => (
                      <tr key={f.id}>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{(floorsQ.page - 1) * floorsQ.pageSize + i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{f.name}</td>
                        <td style={{ fontSize: 13 }}>{f.area}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination page={floorsQ.page} pageSize={floorsQ.pageSize} totalItems={floorsQ.filtered.length} onPageChange={floorsQ.setPage} />
              </div>
            </>
          )}

          {tab === 'Units' && (
            <>
              <ListControls pageSize={unitsQ.pageSize} setPageSize={unitsQ.setPageSize} search={unitsQ.search} setSearch={unitsQ.setSearch} setPage={unitsQ.setPage} />
              <div className="af-prop-table-wrap" style={{ overflowX: 'auto' }}>
                <table className="af-prop-table">
                  <thead><tr><th>#</th><th>Floor</th><th>Name</th><th>Area (m²)</th></tr></thead>
                  <tbody>
                    {unitsQ.filtered.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No units found</td></tr>
                    ) : unitsQ.pageItems.map((u, i) => (
                      <tr key={u.id}>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{(unitsQ.page - 1) * unitsQ.pageSize + i + 1}</td>
                        <td style={{ fontSize: 13 }}>{u.floor_name}</td>
                        <td style={{ fontWeight: 600 }}>{u.name}</td>
                        <td style={{ fontSize: 13 }}>{u.area}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination page={unitsQ.page} pageSize={unitsQ.pageSize} totalItems={unitsQ.filtered.length} onPageChange={unitsQ.setPage} />
              </div>
            </>
          )}

          {tab === 'Financial Report' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {([
                ['Total Rent Collected', fmt(viewing.financial.pay_amount)],
                ['Maintenances By Owner', fmt(viewing.financial.owner_maintenance)],
                ['Maintenances By Renter', fmt(viewing.financial.renter_maintenance)],
                ['Expenses By Owner', fmt(viewing.financial.expenses)],
                ['Profit', fmt(viewing.financial.profit)],
                ['Loss', fmt(viewing.financial.loss)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 650 }}>{k} :</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'Documents' && (
            viewing.documents.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>No documents uploaded</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16 }}>
                {viewing.documents.map(d => (
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
                        background: 'var(--surface2)', height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isImage(d.document) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`${API}${d.document}`} alt={d.document_type_name ?? 'Document'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: 40 }}>📄</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {d.document_type_name ?? 'Document'}
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 13.5 }}>Floors: {viewing.floors.length}</div>
          <div style={{ fontSize: 13.5 }}>Units: {totalUnits}</div>
          <div style={{ fontSize: 13.5 }}>Renters: {viewing.renters.length}</div>
        </div>
      </div>
    </main>
  )
}
