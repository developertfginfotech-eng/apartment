'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Lease {
  id: number
  renter_id: number | null
  renter_name: string
  property_name: string | null
  floor_name: string | null
  units: string | null
  rent_amount: string | number
  rent_deposit: string | number | null
  start_date: string
  end_date: string | null
  status: number
  payment_status: 'Paid' | 'Pending'
}

type Bucket = 'all' | 'active' | 'expiring' | 'expired' | 'inactive'

const STA: Record<Exclude<Bucket, 'all'>, { bg: string; color: string; label: string }> = {
  active:   { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', label: 'Active' },
  expiring: { bg: 'rgba(249,115,22,0.12)', color: '#f97316', label: 'Expiring soon' },
  expired:  { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', label: 'Expired' },
  inactive: { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: 'Inactive' },
}

const EMPTY_FORM = { renter_id: '', property_id: '', floor_name: '', units: '', rent_amount: '', maintenance: '', start_date: '', end_date: '', rent_deposit: '' }

export default function LeasesPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [leases, setLeases] = useState<Lease[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Bucket>('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [renters, setRenters] = useState<{ id: number; name: string }[]>([])
  const [properties, setProperties] = useState<{ id: number; property_name: string }[]>([])

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const fetchLeases = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [activeRes, inactiveRes] = await Promise.all([
        fetch(`${API}/leases/summary?status=1`, { headers: authHeaders() }),
        fetch(`${API}/leases/summary?status=0`, { headers: authHeaders() }),
      ])
      const active = await activeRes.json()
      const inactive = await inactiveRes.json()
      setLeases([...(Array.isArray(active) ? active : []), ...(Array.isArray(inactive) ? inactive : [])])
    } catch { setError('Failed to load leases') }
    finally { setLoading(false) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchLeases() }, [fetchLeases])

  useEffect(() => {
    fetch(`${API}/renters`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setRenters(d)).catch(() => {})
    fetch(`${API}/properties`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setProperties(d)).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const daysLeft = (end: string | null) => end ? Math.ceil((new Date(end).getTime() - Date.now()) / 86400000) : null

  const bucketOf = (l: Lease): Exclude<Bucket, 'all'> => {
    if (l.status === 0) return 'inactive'
    const days = daysLeft(l.end_date)
    if (days !== null && days <= 0) return 'expired'
    if (days !== null && days <= 60) return 'expiring'
    return 'active'
  }

  const buckets = useMemo(() => leases.map(l => ({ lease: l, bucket: bucketOf(l) })), [leases]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = filter === 'all' ? buckets : buckets.filter(b => b.bucket === filter)
  const activeCount = buckets.filter(b => b.bucket === 'active').length
  const expiringCount = buckets.filter(b => b.bucket === 'expiring').length

  const fmt = (v: string | number | null) => `₱ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const save = async () => {
    if (!form.renter_id || !form.property_id || !form.rent_amount || !form.start_date || !form.end_date) return
    try {
      await fetch(`${API}/leases`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          renter_id: parseInt(form.renter_id, 10),
          property_id: parseInt(form.property_id, 10),
          rent_amount: form.rent_amount,
          maintenance: form.maintenance || null,
          rent_deposit: form.rent_deposit || 0,
          start_date: form.start_date,
          end_date: form.end_date,
          status: 1,
        }),
      })
      setShowForm(false)
      setForm(EMPTY_FORM)
      fetchLeases()
    } catch { setError('Failed to create lease') }
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar af-fade-in">
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Leases</h1>
          <p className="af-db-subtitle">{activeCount} active · {expiringCount} expiring soon</p>
        </div>
        <button className="af-btn-primary" onClick={() => setShowForm(true)} style={{ cursor: 'pointer', border: 'none' }}>+ New Lease</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div className="af-tab-bar af-fade-in" style={{ animationDelay: '0.06s' }}>
        {(['all', 'active', 'expiring', 'expired', 'inactive'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`af-tab-pill ${filter === s ? 'active' : ''}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading leases…</div>
      ) : (
        <div className="af-prop-table-wrap af-fade-in" style={{ animationDelay: '0.1s' }}>
          <table className="af-prop-table">
            <thead>
              <tr>
                <th>Renter</th><th>Property</th><th>Floor</th><th>Units</th>
                <th>Period</th><th>Monthly Rent</th><th>Deposit</th><th>Days Left</th>
                <th>Payment</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>No leases found</td></tr>
              ) : filtered.map(({ lease: l, bucket }, i) => {
                const days = daysLeft(l.end_date)
                return (
                  <tr key={l.id} className="af-row-in" style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}>
                    <td style={{ fontWeight: 650 }}>{l.renter_name?.trim() || '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--muted)' }}>{l.property_name || '—'}</td>
                    <td style={{ fontSize: 13 }}>{l.floor_name || '—'}</td>
                    <td><span className="af-prop-badge type">{l.units || '—'}</span></td>
                    <td style={{ fontSize: 12.5 }}>{l.start_date?.slice(0, 10)} → {l.end_date?.slice(0, 10) || '—'}</td>
                    <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(l.rent_amount)}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: '#22c55e' }}>{fmt(l.rent_deposit)}</td>
                    <td style={{ fontSize: 13, color: days !== null && days <= 60 && days > 0 ? '#f97316' : days !== null && days <= 0 ? '#ef4444' : 'var(--text2)', fontWeight: days !== null && days <= 60 ? 650 : 400 }}>
                      {days === null ? '—' : days > 0 ? `${days}d` : 'Ended'}
                    </td>
                    <td>
                      <span className={`af-status-pill ${l.payment_status === 'Pending' ? 'af-pulse' : ''}`} style={{ background: l.payment_status === 'Paid' ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.12)', color: l.payment_status === 'Paid' ? '#22c55e' : '#f97316' }}>
                        {l.payment_status}
                      </span>
                    </td>
                    <td><span className="af-status-pill" style={{ background: STA[bucket].bg, color: STA[bucket].color }}>{STA[bucket].label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="af-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="af-modal af-modal-in" onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">New Lease</h2>
            <div className="af-modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="af-field">
                  <label>Renter</label>
                  <select className="af-select" value={form.renter_id} onChange={e => setForm(f => ({ ...f, renter_id: e.target.value }))}>
                    <option value="">-- Select Renter --</option>
                    {renters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div className="af-field">
                  <label>Property</label>
                  <select className="af-select" value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}>
                    <option value="">-- Select Property --</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.property_name}</option>)}
                  </select>
                </div>
                <div className="af-field"><label>Floor</label><input value={form.floor_name} onChange={e => setForm(f => ({ ...f, floor_name: e.target.value }))} placeholder="4TH"/></div>
                <div className="af-field"><label>Unit</label><input value={form.units} onChange={e => setForm(f => ({ ...f, units: e.target.value }))} placeholder="4B"/></div>
                <div className="af-field"><label>Start Date</label><input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}/></div>
                <div className="af-field"><label>End Date</label><input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}/></div>
                <div className="af-field"><label>Monthly Rent</label><input type="number" min="0" step="0.01" value={form.rent_amount} onChange={e => setForm(f => ({ ...f, rent_amount: e.target.value }))} placeholder="2200"/></div>
                <div className="af-field"><label>Rent Deposit</label><input type="number" min="0" step="0.01" value={form.rent_deposit} onChange={e => setForm(f => ({ ...f, rent_deposit: e.target.value }))} placeholder="4400"/></div>
                <div className="af-field" style={{ gridColumn: 'span 2' }}><label>Maintenance (optional)</label><input value={form.maintenance} onChange={e => setForm(f => ({ ...f, maintenance: e.target.value }))} placeholder="0"/></div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setShowForm(false)}>Cancel</button>
              <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save}>Create lease</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
