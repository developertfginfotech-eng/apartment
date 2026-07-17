'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { formatDate } from '@/lib/date'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp)$/i

interface Doc { id: number; document: string }

const VIEW_TABS = ['Info', 'Properties', 'Documents'] as const
type ViewTab = typeof VIEW_TABS[number]

function ViewExpenseInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<ViewTab>('Info')
  const [docs, setDocs] = useState<Doc[]>([])

  const get = (k: string) => searchParams.get(k) ?? ''
  const id = get('id')
  const fmt = (v: string) => `₱ ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  useEffect(() => {
    if (!id) return
    fetch(`${API}/document/expense?expense_id=${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('apt_token')}` },
    })
      .then(res => res.json())
      .then(data => setDocs(Array.isArray(data) ? data : []))
      .catch(() => setDocs([]))
  }, [id])

  const propertyName = get('property_name')
  const propertyCode = get('property_code')
  const propertyAddress = get('property_address')
  const floorName = get('floor_name')
  const unitName = get('unit_name')

  const infoRows: [string, string][] = [
    ['Property', propertyName || '—'],
    ['Floor', floorName || '—'],
    ['Unit', unitName || '—'],
    ['Title', get('title') || '—'],
    ['Type', get('type_name') || '—'],
    ['Amount', fmt(get('famount'))],
  ]
  const description = get('description')

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Expense Details</h1>
          <p className="af-db-subtitle">{get('title')}</p>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/expenses')}>← Back to Expenses</button>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 560px', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Expenses Details</h2>

          <div className="af-tab-bar" style={{ marginBottom: 18 }}>
            {VIEW_TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} className={`af-tab-pill ${tab === t ? 'active' : ''}`}>{t}</button>
            ))}
          </div>

          {tab === 'Info' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {infoRows.map(([k, v]) => (
                <div key={k} style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
                </div>
              ))}
              {description && (
                <div style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px', gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Details</div>
                  <div style={{ fontSize: 14 }}>{description}</div>
                </div>
              )}
            </div>
          )}

          {tab === 'Properties' && (
            <div className="af-prop-table-wrap">
              <table className="af-prop-table">
                <thead><tr><th>#</th><th>Code</th><th>Name</th><th>Location</th><th>Units</th></tr></thead>
                <tbody>
                  {!propertyName ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No property linked</td></tr>
                  ) : (
                    <tr>
                      <td>1</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{propertyCode || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{propertyName}</td>
                      <td style={{ fontSize: 13 }}>{propertyAddress || '—'}</td>
                      <td style={{ fontSize: 13 }}>{unitName || '—'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Documents' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {docs.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>No documents uploaded</div>
              ) : docs.map(d => (
                <a key={d.id} href={`${API}${d.document}`} target="_blank" rel="noreferrer">
                  {IMAGE_EXT.test(d.document) ? (
                    <img src={`${API}${d.document}`} alt="Document" style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border2)' }} />
                  ) : (
                    <div style={{ width: 140, height: 140, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--accent)', textAlign: 'center', padding: 8 }}>
                      Open Document
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: '0 0 260px', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Summary</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
            <div><span style={{ color: 'var(--muted)' }}>Properties:</span> {propertyName ? 1 : 0}</div>
            <div><span style={{ color: 'var(--muted)' }}>Units:</span> {unitName || ''}</div>
            <div><span style={{ color: 'var(--muted)' }}>Floor:</span> {floorName || ''}</div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function ViewExpensePage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <ViewExpenseInner />
    </Suspense>
  )
}
