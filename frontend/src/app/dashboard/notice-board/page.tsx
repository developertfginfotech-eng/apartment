'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Pagination, { usePagination } from '@/components/Pagination'
import { formatDate } from '@/lib/date'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Notice {
  id: string
  title: string
  desc: string
  recipient: 'All' | 'Tenants' | 'Owners' | 'Staff'
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

      {/* Cards grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading notices…</div>
      ) : filtered.length === 0 ? (
        <div style={{textAlign:'center',padding:'60px 20px',color:'var(--muted)'}}>
          <div style={{fontSize:32,marginBottom:12}}>📌</div>
          <div style={{fontSize:15,fontWeight:600,marginBottom:6}}>No notices found</div>
          <div style={{fontSize:13}}>Post a notice to get started</div>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
          {pageItems.map(n => {
            const rc = RECIPIENT_COLORS[n.recipient] ?? RECIPIENT_COLORS['All']
            return (
              <div key={n.id} style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:14,padding:'20px 22px',display:'flex',flexDirection:'column',gap:10}}>
                {/* Header row */}
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10}}>
                  <div style={{fontWeight:720,fontSize:15,lineHeight:1.35,flex:1}}>{n.title}</div>
                  <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:100,whiteSpace:'nowrap',flexShrink:0,background:n.status==='active'?'rgba(34,197,94,0.12)':'rgba(100,116,139,0.12)',color:n.status==='active'?'#22c55e':'#64748b'}}>
                    {n.status}
                  </span>
                </div>

                {/* Description */}
                <p style={{fontSize:13,color:'var(--muted)',lineHeight:1.6,margin:0}}>{truncate(n.desc, 120)}</p>

                {/* Footer row */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:'auto',paddingTop:4}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:100,...rc}}>{n.recipient}</span>
                    <span style={{fontSize:11,color:'var(--muted)'}}>{formatDate(n.date)}</span>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button className="af-prop-act edit" title="Edit" onClick={() => router.push(`/dashboard/notice-board/edit?id=${n.id}`)}>✏️</button>
                    <button className="af-prop-act del"  title="Delete" onClick={() => del(n.id)}>🗑️</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {filtered.length > 0 && (
        <Pagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />
      )}
    </main>
  )
}
