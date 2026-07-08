'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface CalEvent { id: number; title: string; start: string; end?: string; description?: string }

function pad2(n: number) { return String(n).padStart(2, '0') }
function toDateStr(y: number, m: number, d: number) { return `${y}-${pad2(m + 1)}-${pad2(d)}` }

function Calendar() {
  const today = new Date()
  const [cur, setCur] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [events, setEvents] = useState<CalEvent[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title: '', start: '', end: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [detailDay, setDetailDay] = useState<string | null>(null)

  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

  const first      = new Date(cur.y, cur.m, 1).getDay()
  const daysInMonth = new Date(cur.y, cur.m + 1, 0).getDate()
  const daysInPrev  = new Date(cur.y, cur.m, 0).getDate()
  const cells: { d: number; cur: boolean }[] = []
  for (let i = first - 1; i >= 0; i--) cells.push({ d: daysInPrev - i, cur: false })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ d, cur: true })
  while (cells.length % 7 !== 0) cells.push({ d: cells.length - daysInMonth - first + 1, cur: false })

  const prev = () => setCur(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 })
  const next = () => setCur(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 })
  const isToday = (d: number, isCur: boolean) =>
    isCur && d === today.getDate() && cur.m === today.getMonth() && cur.y === today.getFullYear()

  const fetchEvents = useCallback(() => {
    const token = localStorage.getItem('apt_token')
    fetch(`${API}/calendar`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => Array.isArray(d) && setEvents(d))
      .catch(() => {})
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const eventsOnDay = (dateStr: string) =>
    events.filter(e => e.start <= dateStr && (!e.end || e.end >= dateStr))

  const openAdd = (d: number) => {
    const dateStr = toDateStr(cur.y, cur.m, d)
    setForm({ title: '', start: dateStr, end: dateStr, description: '' })
    setDetailDay(null)
    setModal(true)
  }

  const saveEvent = async () => {
    if (!form.title || !form.start) return
    setSaving(true)
    try {
      const token = localStorage.getItem('apt_token')
      await fetch(`${API}/calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      setModal(false)
      fetchEvents()
    } finally { setSaving(false) }
  }

  const deleteEvent = async (id: number) => {
    const token = localStorage.getItem('apt_token')
    await fetch(`${API}/calendar/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    fetchEvents()
    setDetailDay(null)
  }

  const dayEventsForDetail = detailDay ? eventsOnDay(detailDay) : []

  return (
    <>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontWeight: 750, fontSize: 15 }}>{MONTHS[cur.m]} {cur.y}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={prev} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <button onClick={() => setCur({ y: today.getFullYear(), m: today.getMonth() })} style={{ padding: '0 10px', height: 28, borderRadius: 7, border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Today</button>
            <button onClick={next} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, textAlign: 'center' }}>
          {DAYS.map(d => (
            <div key={d} style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', padding: '4px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>{d}</div>
          ))}
          {cells.map((c, i) => {
            const dateStr = c.cur ? toDateStr(cur.y, cur.m, c.d) : ''
            const dayEvents = dateStr ? eventsOnDay(dateStr) : []
            const hasDot = dayEvents.length > 0
            return (
              <div
                key={i}
                onClick={() => {
                  if (!c.cur) return
                  if (dayEvents.length > 0) { setDetailDay(dateStr); setModal(false) }
                  else openAdd(c.d)
                }}
                title={c.cur ? (hasDot ? `${dayEvents.length} event(s) — click to view` : 'Click to add event') : ''}
                style={{
                  fontSize: 13, padding: '7px 2px', borderRadius: 8,
                  fontWeight: isToday(c.d, c.cur) ? 800 : 500,
                  background: isToday(c.d, c.cur) ? 'var(--accent)' : 'transparent',
                  color: isToday(c.d, c.cur) ? '#fff' : c.cur ? 'var(--text)' : 'var(--border2)',
                  cursor: c.cur ? 'pointer' : 'default',
                  position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                }}
              >
                {c.d}
                {hasDot && (
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: isToday(c.d, c.cur) ? '#fff' : 'var(--accent)', display: 'block' }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Add event modal */}
      {modal && (
        <div className="af-modal-overlay" onClick={() => setModal(false)}>
          <div className="af-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">Add Calendar Detail</h2>
            <div className="af-modal-form" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="af-field">
                <label>Title name</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Rent collection" autoFocus />
              </div>
              <div className="af-field">
                <label>Start Date</label>
                <input type="date" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))} />
              </div>
              <div className="af-field">
                <label>End Date</label>
                <input type="date" value={form.end} onChange={e => setForm(f => ({ ...f, end: e.target.value }))} />
              </div>
              <div className="af-field">
                <label>Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional notes…"
                  rows={3}
                  style={{ resize: 'vertical', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 9, padding: '10px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setModal(false)}>Close</button>
              <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} disabled={saving} onClick={saveEvent}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day detail modal */}
      {detailDay && (
        <div className="af-modal-overlay" onClick={() => setDetailDay(null)}>
          <div className="af-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title" style={{ marginBottom: 14 }}>Events — {detailDay}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {dayEventsForDetail.map(ev => (
                <div key={ev.id} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{ev.title}</div>
                    {ev.description && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{ev.description}</div>}
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{ev.start}{ev.end && ev.end !== ev.start ? ` → ${ev.end}` : ''}</div>
                  </div>
                  <button onClick={() => deleteEvent(ev.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: 16, padding: '0 0 0 10px', flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setDetailDay(null)}>Close</button>
              <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none' }} onClick={() => { openAdd(parseInt(detailDay.split('-')[2])); setDetailDay(null) }}>+ Add Event</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

interface Stats {
  properties: { total: number; active: number }
  renters: { total: number }
  maintenance: { total: number; pending: number; completed: number }
  payments: { received: { count: number; amount: number }; pending: { count: number; amount: number } }
  amountReceived: number
  amountDue: number
  recentRenters: { name: string; property_name: string; floor_name: string; unit_name: string; renter_status: number }[]
  expiredLeases: { renter_name: string; property_name: string; rent_amount: string; status: number }[]
}

const QUICK = [
  { label:'Properties', href:'/dashboard/properties', color:'#3b82f6' },
  { label:'Owners',     href:'/dashboard/owners',     color:'#22c55e' },
  { label:'Renters',    href:'/dashboard/tenants',    color:'#f97316' },
  { label:'Leases',     href:'/dashboard/leases',     color:'#a855f7' },
  { label:'Payments',   href:'/dashboard/payments',   color:'#14b8a6' },
  { label:'Maintenance',href:'/dashboard/maintenance',color:'#f59e0b' },
  { label:'Expenses',   href:'/dashboard/expenses',   color:'#ec4899' },
  { label:'Reports',    href:'/dashboard/reports',    color:'#8b5cf6' },
]

function fmt(n: number) {
  return '₱ ' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ name: string; role: string } | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('apt_user')
    if (stored) try { setUser(JSON.parse(stored)) } catch { /**/ }

    const token = localStorage.getItem('apt_token')
    fetch(`${API}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.properties) setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const statCards = stats ? [
    {
      label: 'Properties',
      value: stats.properties.total,
      subs: [
        { label: 'On Rent', val: stats.renters.total },
        { label: 'Available', val: Math.max(0, stats.properties.total - stats.renters.total) },
      ],
      color: '#3b82f6',
      icon: '🏢',
    },
    {
      label: 'Renters',
      value: stats.renters.total,
      subs: [],
      color: '#f97316',
      icon: '👥',
    },
    {
      label: 'Maintenances',
      value: stats.maintenance.total,
      subs: [
        { label: 'Pending', val: stats.maintenance.pending },
        { label: 'Completed', val: stats.maintenance.completed },
      ],
      color: '#a855f7',
      icon: '🔧',
    },
    {
      label: 'Monthly Bill',
      value: null,
      subs: [
        { label: 'Rent Received', val: stats.payments.received.count },
        { label: 'Rent Pending', val: stats.payments.pending.count },
      ],
      color: '#22c55e',
      icon: '💳',
    },
  ] : []

  return (
    <main className="af-db-main">
      {/* Header */}
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: 16, marginBottom: 24,
        background: 'linear-gradient(135deg, #3d1206 0%, #1a0a04 35%, #0d1020 65%, #080d1a 100%)',
        padding: '32px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* sparkles */}
        {[
          [8,20],[18,70],[45,15],[55,80],[72,30],[80,60],[92,10],[88,85],[30,50],[63,45]
        ].map(([top,left],i) => (
          <div key={i} style={{
            position:'absolute', top:`${top}%`, left:`${left}%`,
            width: i%3===0?6:i%3===1?4:3, height: i%3===0?6:i%3===1?4:3,
            color:'rgba(255,255,255,0.35)', fontSize: i%3===0?10:8,
            pointerEvents:'none', userSelect:'none',
          }}>{ i%2===0 ? '✦' : '+' }</div>
        ))}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, marginBottom: 6, color: '#fff' }}>
            Welcome back, <span style={{ color: 'var(--accent)' }}>{user?.name?.split(' ')[0] ?? 'Admin'}</span>
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Here&apos;s what&apos;s happening with your properties today.</p>
        </div>
        <Link className="af-btn-primary" href="/dashboard/admins" style={{ textDecoration: 'none', position: 'relative', zIndex: 1 }}>Manage Admins</Link>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
          Loading dashboard data…
        </div>
      )}

      {!loading && stats && (
        <>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
            {statCards.map((c, i) => (
              <div key={c.label} className="af-stat-card" style={{ animationDelay: `${i * 0.05}s`, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: '18px 20px', borderTop: `3px solid ${c.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${c.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{c.icon}</div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{c.label}</span>
                </div>
                {c.value !== null && (
                  <div style={{ fontSize: 32, fontWeight: 800, color: c.color, marginBottom: 10 }}>{c.value}</div>
                )}
                {c.subs.map(s => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--muted)', marginBottom: 3 }}>
                    <span>{s.label}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>{s.val}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Financial Summary + Calendar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: '20px 24px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Total Amount Due</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#ef4444', marginBottom: 8 }}>{fmt(stats.amountDue)}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Pending rent from {stats.payments.pending.count} payments</div>
              </div>
              <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 14, padding: '20px 24px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Amount Received</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#22c55e', marginBottom: 8 }}>{fmt(stats.amountReceived)}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Collected from {stats.payments.received.count} payments</div>
              </div>
            </div>
            <Calendar />
          </div>

          {/* Tables Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Active Renters */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Active Renters</span>
                <Link href="/dashboard/tenants" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>View all →</Link>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface2)' }}>
                      <th style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600 }}>#</th>
                      <th style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600 }}>Name</th>
                      <th style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600 }}>Property</th>
                      <th style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600 }}>Unit</th>
                      <th style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentRenters.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border2)' }}>
                        <td style={{ padding: '9px 14px', color: 'var(--muted)' }}>{i + 1}</td>
                        <td style={{ padding: '9px 14px', fontWeight: 600 }}>{r.name}</td>
                        <td style={{ padding: '9px 14px', color: 'var(--muted)' }}>{r.property_name ?? '—'}</td>
                        <td style={{ padding: '9px 14px', color: 'var(--muted)' }}>{r.unit_name ?? '—'}</td>
                        <td style={{ padding: '9px 14px' }}>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: r.renter_status ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: r.renter_status ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                            {r.renter_status ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {stats.recentRenters.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>No renters found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expired Leases */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Expired Lease Agreements</span>
                <Link href="/dashboard/leases" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>View all →</Link>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface2)' }}>
                      <th style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600 }}>#</th>
                      <th style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600 }}>Renter</th>
                      <th style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600 }}>Property</th>
                      <th style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600 }}>Rent</th>
                      <th style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.expiredLeases.map((l, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border2)' }}>
                        <td style={{ padding: '9px 14px', color: 'var(--muted)' }}>{i + 1}</td>
                        <td style={{ padding: '9px 14px', fontWeight: 600 }}>{l.renter_name ?? '—'}</td>
                        <td style={{ padding: '9px 14px', color: 'var(--muted)' }}>{l.property_name ?? '—'}</td>
                        <td style={{ padding: '9px 14px', fontVariantNumeric: 'tabular-nums' }}>₱{Number(l.rent_amount).toLocaleString()}</td>
                        <td style={{ padding: '9px 14px' }}>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontWeight: 700 }}>Inactive</span>
                        </td>
                      </tr>
                    ))}
                    {stats.expiredLeases.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>No expired leases</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quick Access */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.8 }}>Quick Access</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {QUICK.map(q => (
                <Link key={q.label} href={q.href} style={{ textDecoration: 'none', padding: '8px 18px', borderRadius: 8, background: `${q.color}14`, color: q.color, fontSize: 13, fontWeight: 650, border: `1px solid ${q.color}30` }}>
                  {q.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  )
}
