'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('apt_token')}` })

interface Renter {
  id: number
  property_id: number | null
  first_name: string
  middle_name: string | null
  last_name: string | null
  name: string
  renter_type: string | null
  company_type: string | null
  email: string
  contact: string
  national_id: string | null
  address: string | null
  renter_status: number
}

interface Doc { id: number; document_type: number; document: string; document_type_name: string }

interface PropertyRow {
  id: number
  property_code: string | null
  property_name: string | null
  address: string | null
  floors: { units: unknown[] }[]
}

const VIEW_TABS = ['Info', 'Properties', 'Documents'] as const
type ViewTab = typeof VIEW_TABS[number]

const isImage = (url: string) => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url)

export default function RenterView({ renterId }: { renterId: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [renter, setRenter]   = useState<Renter | null>(null)
  const [docs, setDocs]       = useState<Doc[]>([])
  const [property, setProperty] = useState<PropertyRow | null>(null)
  const [tab, setTab]         = useState<ViewTab>('Info')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  const loadDocs = useCallback(async (id: number) => {
    const res = await fetch(`${API}/document/renter?renter_id=${id}`, { headers: headers() })
    setDocs(await res.json())
  }, [])

  useEffect(() => {
    (async () => {
      setLoading(true); setError('')
      try {
        const res = await fetch(`${API}/renters/${renterId}`, { headers: headers() })
        if (!res.ok) throw new Error()
        const r: Renter = await res.json()
        setRenter(r)
        await loadDocs(renterId)
        if (r.property_id) {
          const pRes = await fetch(`${API}/properties/${r.property_id}`, { headers: headers() })
          if (pRes.ok) setProperty(await pRes.json())
        }
      } catch {
        setError('Failed to load renter')
      } finally {
        setLoading(false)
      }
    })()
  }, [renterId, loadDocs])

  const removeDoc = async (id: number) => {
    await fetch(`${API}/document/renter/${id}`, { method: 'DELETE', headers: headers() })
    await loadDocs(renterId)
  }

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }
  if (error || !renter) {
    return (
      <main className="af-db-main">
        <div style={{ color: '#ef4444', marginBottom: 16 }}>{error || 'Renter not found'}</div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/tenants')}>← Back to Tenants</button>
      </main>
    )
  }

  const isCompany = renter.renter_type === 'company'
  const totalUnits = property?.floors?.reduce((n, f) => n + (f.units?.length ?? 0), 0) ?? 0

  return (
    <main className="af-db-main">
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 760, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 820, letterSpacing: '-0.025em', marginBottom: 6 }}>Renter Details</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>{renter.name?.trim()}</p>
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
                  boxShadow: '0 12px 32px rgba(0,0,0,0.25)', minWidth: 150, overflow: 'hidden',
                }}>
                  <button
                    onClick={() => router.push(`/dashboard/tenants/edit?id=${renter.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px',
                      background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 13, fontWeight: 600, color: 'var(--text)', textAlign: 'left',
                    }}
                  >
                    ✏️ Edit Renter
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="af-tab-bar" style={{ marginTop: 18, marginBottom: 18 }}>
          {VIEW_TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`af-tab-pill ${tab === t ? 'active' : ''}`}>{t}</button>
          ))}
        </div>

        {tab === 'Info' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {([
              ['Renter Type', isCompany ? 'Company' : 'Individual'],
              [isCompany ? 'Company Name' : 'First Name', renter.first_name || '—'],
              ...(isCompany
                ? [['Company Type', renter.company_type || '—']]
                : [['Middle Name', renter.middle_name || '—'], ['Last Name', renter.last_name || '—']]),
              [isCompany ? 'Company Email' : 'Email', renter.email || '—'],
              [isCompany ? 'Company Contact' : 'Contact', renter.contact || '—'],
              ['NID(National ID)', renter.national_id || '—'],
              ['Address', renter.address || '—'],
              ['Status', renter.renter_status === 0 ? 'Expired' : 'Active'],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'Properties' && (
          <div className="af-prop-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="af-prop-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Units</th>
                </tr>
              </thead>
              <tbody>
                {!property ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No property assigned</td></tr>
                ) : (
                  <tr>
                    <td>1</td>
                    <td>{property.property_code || '—'}</td>
                    <td>{property.property_name || '—'}</td>
                    <td>{property.address || '—'}</td>
                    <td>{totalUnits}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Documents' && (
          docs.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>No documents uploaded</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16 }}>
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
    </main>
  )
}
