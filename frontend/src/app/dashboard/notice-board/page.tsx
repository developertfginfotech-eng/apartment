'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Pagination, { usePagination } from '@/components/Pagination'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Notice {
  id: string
  title: string
  desc: string
  recipient: 'All' | 'Tenants' | 'Owners' | 'Staff'
  sender: string | null
  date: string
  status: 'active' | 'inactive'
}

const RECIPIENT_COLORS: Record<string, { bg: string; color: string }> = {
  All:     { bg:'rgba(59,130,246,0.12)',  color:'#3b82f6' },
  Tenants: { bg:'rgba(34,197,94,0.12)',   color:'#22c55e' },
  Owners:  { bg:'rgba(168,85,247,0.12)',  color:'#a855f7' },
  Staff:   { bg:'rgba(249,115,22,0.12)',  color:'#f97316' },
}

export default function NoticeBoardPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'All Types'|'All'|'Tenants'|'Owners'|'Staff'>('All Types')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const fetchNotices = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/notice-board`, { headers: authHeaders() })
      const data = await res.json()
      setNotices(Array.isArray(data) ? data : [])
    } catch { setError('Failed to load notices') }
    finally { setLoading(false) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchNotices() }, [fetchNotices])

  const filtered = filter === 'All Types' ? notices : notices.filter(n => n.recipient === filter)
  const { page, setPage, pageSize, pageItems } = usePagination(filtered, 10)

  const del = async (id: string) => {
    if (!confirm('Delete this notice?')) return
    try {
      await fetch(`${API}/notice-board/${id}`, { method: 'DELETE', headers: authHeaders() })
      fetchNotices()
    } catch { setError('Failed to delete notice') }
  }

  const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + '…' : s

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{fontSize:26}}>Notice Board</h1>
          <p className="af-db-subtitle">{loading ? 'Loading…' : `${notices.length} notice${notices.length !== 1 ? 's' : ''} total · ${notices.filter(n=>n.status==='active').length} active`}</p>
        </div>
        <button className="af-btn-primary" onClick={() => router.push('/dashboard/notice-board/new')} style={{cursor:'pointer',border:'none'}}>+ Post Notice</button>
      </div>

      {/* Filter tabs */}
      <div style={{display:'flex',gap:6,marginBottom:24,flexWrap:'wrap'}}>
        {(['All Types','All','Tenants','Owners','Staff'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{padding:'7px 14px',borderRadius:8,border:'1px solid',fontSize:12.5,fontWeight:600,cursor:'pointer',fontFamily:'inherit',borderColor:filter===f?'var(--accent)':'var(--border2)',background:filter===f?'rgba(249,115,22,0.12)':'var(--surface)',color:filter===f?'var(--accent)':'var(--muted)'}}>
            {f}
          </button>
        ))}
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading notices…</div>
      ) : (
        <div className="af-prop-table-wrap">
          <table className="af-prop-table">
            <thead>
              <tr>
                <th>#</th><th>Title</th><th>Send User</th><th>Receive User</th>
                <th>Messages</th><th>Attachment</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: '36px 0' }}>No notices found</td></tr>
              ) : pageItems.map((n, i) => {
                const rc = RECIPIENT_COLORS[n.recipient] ?? RECIPIENT_COLORS['All']
                return (
                  <tr key={n.id}>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{(page - 1) * pageSize + i + 1}</td>
                    <td style={{ fontWeight: 650 }}>{n.title}</td>
                    <td style={{ fontSize: 13 }}>{n.sender || 'Admin'}</td>
                    <td><span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100, ...rc }}>{n.recipient}</span></td>
                    <td style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 260 }}>{truncate(n.desc, 80)}</td>
                    <td style={{ fontSize: 13, color: 'var(--muted)' }}>—</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="af-prop-act edit" title="Edit" onClick={() => router.push(`/dashboard/notice-board/edit?id=${n.id}`)}>✏️</button>
                        <button className="af-prop-act del" title="Delete" onClick={() => del(n.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {filtered.length > 0 && (
        <Pagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />
      )}
    </main>
  )
}
