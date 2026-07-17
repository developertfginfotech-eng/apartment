'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/date'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface LeaseFull {
  id: number
  type: string | null
  amount: string | null
  rent_amount: string | null
  start_date: string | null
  end_date: string | null
  document_image: string | null
  unit_ids: number[]
  renter_name: string
  renter_type: string | null
  renter_email: string | null
  renter_contact: string | null
  renter_national_id: string | null
  renter_address: string | null
  property_name: string | null
  floor_name: string | null
}

const VIEW_TABS = ['Info', 'Renter Details', 'Documents'] as const
type ViewTab = typeof VIEW_TABS[number]

export default function LeaseView({ leaseId }: { leaseId: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [viewing, setViewing] = useState<LeaseFull | null>(null)
  const [viewTab, setViewTab] = useState<ViewTab>('Info')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fmt = (v: string | number | null) => `₱ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  useEffect(() => {
    (async () => {
      setLoading(true); setError('')
      try {
        const res = await fetch(`${API}/leases/${leaseId}/full`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('apt_token')}` },
        })
        setViewing(await res.json())
      } catch { setError('Failed to load lease') }
      finally { setLoading(false) }
    })()
  }, [leaseId])

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }
  if (error || !viewing) {
    return (
      <main className="af-db-main">
        <div style={{ color: '#ef4444', marginBottom: 16 }}>{error || 'Lease not found'}</div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/leases')}>← Back to Leases</button>
      </main>
    )
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Lease Details</h1>
          <p className="af-db-subtitle">{viewing.renter_name?.trim()}</p>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/leases')}>← Back to Leases</button>
      </div>

      <div className="af-tab-bar" style={{ marginBottom: 18 }}>
        {VIEW_TABS.map(t => (
          <button key={t} onClick={() => setViewTab(t)} className={`af-tab-pill ${viewTab === t ? 'active' : ''}`}>{t}</button>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 720 }}>
        {viewTab === 'Info' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {([
              ['Type', viewing.type || '—'],
              ['Renter', viewing.renter_name?.trim() || '—'],
              ['Property', viewing.property_name || '—'],
              ['Floor', viewing.floor_name || '—'],
              ['Unit(s)', viewing.unit_ids?.join(', ') || '—'],
              ['Start Date', formatDate(viewing.start_date)],
              ['End Date', formatDate(viewing.end_date)],
              ['Rent Amount', fmt(viewing.amount)],
              ['Total Rent (incl. VAT)', fmt(viewing.rent_amount)],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
        )}

        {viewTab === 'Renter Details' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {([
              ['Name', viewing.renter_name?.trim() || '—'],
              ['Type', viewing.renter_type ?? 'individual'],
              ['Email', viewing.renter_email || '—'],
              ['Contact', viewing.renter_contact || '—'],
              ['National ID', viewing.renter_national_id || '—'],
              ['Address', viewing.renter_address || '—'],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
        )}

        {viewTab === 'Documents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {!viewing.document_image ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>No documents uploaded</div>
            ) : viewing.document_image.split(',').filter(Boolean).map((d, i) => (
              <a key={i} href={`${API}${d}`} target="_blank" rel="noreferrer"
                style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--accent)' }}>
                {d.split('/').pop()}
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
