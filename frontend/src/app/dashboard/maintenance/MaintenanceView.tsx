'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDateTime } from '@/lib/date'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('apt_token')}` })

interface MaintenanceDetail {
  id: number
  title: string
  property_id: number | null
  property_name: string | null
  property_code: string | null
  property_address: string | null
  floor_id: number | null
  floor_name: string | null
  unit_id: number | null
  unit_name: string | null
  type: string | null
  type_name: string | null
  famount: string | null
  tax: string | null
  amount: string | null
  date: string | null
  maintenance_by: string | null
  maintenances_paid_by: number | null
  maintenances_status: number
  reject_details: string | null
  payment_status: number
  payment_type: string | null
  receipt_image: string | null
  description: string | null
}

interface PropertyRow {
  id: number
  property_code: string | null
  property_name: string | null
  address: string | null
  floors: { units: unknown[] }[]
}

interface Doc { id: number; document_type: number; document: string; document_type_name: string }

const VIEW_TABS = ['Info', 'Properties', 'Documents'] as const
type ViewTab = typeof VIEW_TABS[number]

const REQUESTED_BY: Record<string, string> = { '0': 'Owner', '1': 'Renter', '2': 'Admin', '3': 'Maintenance' }
const PAID_BY_OPTIONS = [
  { value: '0', label: 'Owner' },
  { value: '1', label: 'Renter' },
  { value: '2', label: 'Admin' },
  { value: '3', label: 'Maintenance' },
]
const MAINTENANCE_STATUS: Record<number, string> = { 0: 'Under Process', 1: 'Open', 2: 'Completed', 3: 'Rejected' }
const isImage = (url: string) => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url)

export default function MaintenanceView({ maintenanceId }: { maintenanceId: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [viewing, setViewing] = useState<MaintenanceDetail | null>(null)
  const [property, setProperty] = useState<PropertyRow | null>(null)
  const [docs, setDocs]       = useState<Doc[]>([])
  const [tab, setTab]         = useState<ViewTab>('Info')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  const [taxes, setTaxes] = useState<{ id: number; key: string; value: string }[]>([])
  const [financeForm, setFinanceForm] = useState({ famount: '', tax: '', maintenances_paid_by: '' })
  const [savingFinance, setSavingFinance] = useState(false)

  const loadDocs = useCallback(async (id: number) => {
    const res = await fetch(`${API}/document/maintenance?maintenance_id=${id}`, { headers: headers() })
    setDocs(await res.json())
  }, [])

  useEffect(() => {
    fetch(`${API}/tax`, { headers: headers() }).then(r => r.json()).then(d => Array.isArray(d) && setTaxes(d)).catch(() => {})
  }, [])

  useEffect(() => {
    (async () => {
      setLoading(true); setError('')
      try {
        const res = await fetch(`${API}/maintenance/${maintenanceId}`, { headers: headers() })
        if (!res.ok) throw new Error()
        const m: MaintenanceDetail = await res.json()
        setViewing(m)
        setFinanceForm({
          famount: m.famount ?? '',
          tax: m.tax ?? '',
          maintenances_paid_by: m.maintenances_paid_by != null ? String(m.maintenances_paid_by) : '',
        })
        await loadDocs(maintenanceId)
        if (m.property_id) {
          const pRes = await fetch(`${API}/properties/${m.property_id}`, { headers: headers() })
          if (pRes.ok) setProperty(await pRes.json())
        }
      } catch {
        setError('Failed to load maintenance record')
      } finally {
        setLoading(false)
      }
    })()
  }, [maintenanceId, loadDocs])

  const removeDoc = async (id: number) => {
    await fetch(`${API}/document/maintenance/${id}`, { method: 'DELETE', headers: headers() })
    await loadDocs(maintenanceId)
  }

  const financeFinalAmount = ((Number(financeForm.famount) || 0) + (Number(financeForm.famount) || 0) * (Number(financeForm.tax) || 0) / 100).toFixed(2)

  const saveFinance = async () => {
    if (!viewing) return
    setSavingFinance(true)
    try {
      const res = await fetch(`${API}/maintenance/${viewing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({
          famount: financeForm.famount || null,
          tax: financeForm.tax || 0,
          amount: financeFinalAmount,
          maintenances_paid_by: financeForm.maintenances_paid_by ? Number(financeForm.maintenances_paid_by) : null,
        }),
      })
      if (!res.ok) throw new Error()
      const updated = await fetch(`${API}/maintenance/${viewing.id}`, { headers: headers() }).then(r => r.json())
      setViewing(updated)
    } catch {
      setError('Failed to update amount')
    } finally {
      setSavingFinance(false)
    }
  }

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }
  if (error || !viewing) {
    return (
      <main className="af-db-main">
        <div style={{ color: '#ef4444', marginBottom: 16 }}>{error || 'Maintenance record not found'}</div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/maintenance')}>← Back to Maintenance</button>
      </main>
    )
  }

  const totalUnits = property?.floors?.reduce((n, f) => n + (f.units?.length ?? 0), 0) ?? 0

  return (
    <main className="af-db-main">
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 760, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 820, letterSpacing: '-0.025em', marginBottom: 6 }}>Maintenance Details</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>{viewing.title}</p>
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
                    onClick={() => router.push(`/dashboard/maintenance/edit?id=${viewing.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px',
                      background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 13, fontWeight: 600, color: 'var(--text)', textAlign: 'left',
                    }}
                  >
                    ✏️ Edit Maintenance
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
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {([
                ['Title', viewing.title],
                ['Property', viewing.property_name || '—'],
                ['Floor', viewing.floor_name || '—'],
                ['Unit', viewing.unit_name || '—'],
                ['Type', viewing.type_name || '—'],
                ['Date', formatDateTime(viewing.date)],
                ['Requested By', REQUESTED_BY[viewing.maintenance_by ?? ''] ?? '—'],
                ['Maintenances Status', MAINTENANCE_STATUS[viewing.maintenances_status] ?? '—'],
                ['Payment Status', viewing.payment_status === 1 ? 'Paid' : 'Pending'],
                ['Payment Type', viewing.payment_type || '—'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
                </div>
              ))}
              <div style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px', gridColumn: '1/-1' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Details</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{viewing.description || '—'}</div>
              </div>
              {viewing.maintenances_status === 3 && (
                <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: 9, padding: '10px 14px', gridColumn: '1/-1' }}>
                  <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Rejected Reason</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{viewing.reject_details || '—'}</div>
                </div>
              )}
              {viewing.receipt_image && (
                <div style={{ gridColumn: '1/-1' }}>
                  <a href={`${API}${viewing.receipt_image}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--accent)' }}>View Receipt Image</a>
                </div>
              )}
            </div>

            {(() => {
              const locked = viewing.maintenances_status === 2 || viewing.maintenances_status === 3
              return (
                <div style={{ marginTop: 20, borderTop: '1px solid var(--border2)', paddingTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Amount</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="af-field">
                      <label>Amount</label>
                      <input type="number" min="0" step="0.01" disabled={locked} value={financeForm.famount} onChange={e => setFinanceForm(f => ({ ...f, famount: e.target.value }))} placeholder="0.00" />
                    </div>
                    <div className="af-field">
                      <label>Tax (%)</label>
                      <select className="af-select" disabled={locked} value={financeForm.tax} onChange={e => setFinanceForm(f => ({ ...f, tax: e.target.value }))}>
                        <option value="">-- Select Tax --</option>
                        {taxes.map(t => <option key={t.id} value={t.value}>{t.key} ({t.value}%)</option>)}
                      </select>
                    </div>
                    <div className="af-field">
                      <label>Final Amount</label>
                      <input readOnly value={financeFinalAmount} style={{ opacity: 0.75 }} />
                    </div>
                    <div className="af-field">
                      <label>Maintenance Paid By</label>
                      <select className="af-select" disabled={locked} value={financeForm.maintenances_paid_by} onChange={e => setFinanceForm(f => ({ ...f, maintenances_paid_by: e.target.value }))}>
                        <option value="">-- Select --</option>
                        {PAID_BY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                  {!locked && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                      <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={saveFinance} disabled={savingFinance}>
                        {savingFinance ? 'Updating…' : 'Update'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })()}
          </>
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
