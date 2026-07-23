'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/date'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('apt_token')}` })

interface OwnerProperty { id: number; property_name: string; property_code: string; address: string; total_floor: number; total_unit: number }

interface OwnerDetail {
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
  state: string | null
  city: string | null
  postal_address: string | null
  physical_address: string | null
  residential_address: string | null
  properties: OwnerProperty[]
}

interface Doc { id: number; document_type: number; document: string; document_type_name: string }

const VIEW_TABS = ['Info', 'Properties', 'Documents'] as const
type ViewTab = typeof VIEW_TABS[number]

const isImage = (url: string) => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url)

export default function OwnerView({ ownerId }: { ownerId: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [viewing, setViewing] = useState<OwnerDetail | null>(null)
  const [docs, setDocs]       = useState<Doc[]>([])
  const [tab, setTab]         = useState<ViewTab>('Info')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  const loadDocs = useCallback(async (id: number) => {
    const res = await fetch(`${API}/document/landlord?landlord_id=${id}`, { headers: headers() })
    setDocs(await res.json())
  }, [])

  useEffect(() => {
    (async () => {
      setLoading(true); setError('')
      try {
        const res = await fetch(`${API}/landlords/${ownerId}`, { headers: headers() })
        if (!res.ok) throw new Error()
        setViewing(await res.json())
        await loadDocs(ownerId)
      } catch {
        setError('Failed to load owner')
      } finally {
        setLoading(false)
      }
    })()
  }, [ownerId, loadDocs])

  const removeDoc = async (id: number) => {
    await fetch(`${API}/document/landlord/${id}`, { method: 'DELETE', headers: headers() })
    await loadDocs(ownerId)
  }

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }
  if (error || !viewing) {
    return (
      <main className="af-db-main">
        <div style={{ color: '#ef4444', marginBottom: 16 }}>{error || 'Owner not found'}</div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/owners')}>← Back to Owners</button>
      </main>
    )
  }

  return (
    <main className="af-db-main">
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 760, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 820, letterSpacing: '-0.025em', marginBottom: 6 }}>Property Owner Details</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              {[viewing.first_name, viewing.middle_name, viewing.last_name].filter(Boolean).join(' ')}
            </p>
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
                    onClick={() => router.push(`/dashboard/owners/edit?id=${viewing.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px',
                      background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 13, fontWeight: 600, color: 'var(--text)', textAlign: 'left',
                    }}
                  >
                    ✏️ Edit Owner
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
              ['Owner Type', viewing.owner_type || '—'],
              ['Company Type', viewing.company_type || '—'],
              ['First Name', viewing.first_name],
              ['Last Name', viewing.last_name || '—'],
              ['Phone', viewing.phone || '—'],
              ['Email', viewing.email || '—'],
              ['Registration Date', formatDate(viewing.registration_date)],
              ['National ID', viewing.id_number || '—'],
              ['Country', viewing.country || '—'],
              ['State', viewing.state || '—'],
              ['City', viewing.city || '—'],
              ['Postal Address', viewing.postal_address || '—'],
              ['Physical Address', viewing.physical_address || '—'],
              ['Residential Address', viewing.residential_address || '—'],
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
              <thead><tr><th>#</th><th>Code</th><th>Name</th><th>Location</th><th>Floors</th><th>Units</th></tr></thead>
              <tbody>
                {viewing.properties.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No properties found</td></tr>
                ) : viewing.properties.map((p, i) => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{p.property_code}</td>
                    <td style={{ fontWeight: 600 }}>{p.property_name}</td>
                    <td style={{ fontSize: 13 }}>{p.address}</td>
                    <td style={{ fontSize: 13 }}>{p.total_floor}</td>
                    <td style={{ fontSize: 13 }}>{p.total_unit}</td>
                  </tr>
                ))}
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
