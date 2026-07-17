'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Pagination from '@/components/Pagination'
import { formatDateTime } from '@/lib/date'

interface Notif { id:string; type:string; title:string; body:string; read:boolean; createdAt:string }

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const TYPE_COLOR: Record<string,string> = { message:'#3b82f6', admin:'#f97316', lease_expiring:'#f97316' }
const TYPE_ICON: Record<string,string> = { message:'✉️', admin:'🛡️', lease_expiring:'⏰' }
const TYPE_LABEL: Record<string,string> = {
  message: 'Message', admin: 'Admin', lease_expiring: 'Lease Expiring', lease: 'Lease',
  renter: 'Renter', maintenance: 'Maintenance', vendor: 'Vendor', property: 'Property',
  payment: 'Payment', expense: 'Expense', users: 'User',
}
const humanizeType = (t: string) => TYPE_LABEL[t] ?? t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const PAGE_SIZE = 20

export default function NotificationsPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const token  = localStorage.getItem('apt_token')
    const stored = localStorage.getItem('apt_user')
    if (!token || !stored) { router.push('/login'); return }
    try {
      const user = JSON.parse(stored)
      if (user.role !== 'super_admin') { router.push('/dashboard'); return }
      setAuthorized(true)
    } catch { router.push('/login') }
  }, [router])

  const [notifs, setNotifs] = useState<Notif[]>([])
  const [total, setTotal] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all'|'unread'|'read'>('all')
  const [page, setPage] = useState(1)

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('apt_token')}` })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), filter })
      const res = await fetch(`${API}/notifications?${params}`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setNotifs(data.data ?? [])
        setTotal(data.total ?? 0)
      }
      const countRes = await fetch(`${API}/notifications/unread-count`, { headers: authHeaders() })
      if (countRes.ok) setUnreadCount((await countRes.json()).count)
    } finally {
      setLoading(false)
    }
  }, [page, filter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (authorized) load() }, [authorized, load])

  const changeFilter = (f: 'all'|'unread'|'read') => { setFilter(f); setPage(1) }

  const markRead = async (n: Notif) => {
    if (n.read) return
    setNotifs(ns => ns.map(x => x.id===n.id ? {...x, read:true} : x))
    setUnreadCount(c => Math.max(0, c - 1))
    await fetch(`${API}/notifications/${n.id}/read`, { method: 'PATCH', headers: authHeaders() })
  }

  const markAllRead = async () => {
    setNotifs(ns => ns.map(n => ({...n, read:true})))
    setUnreadCount(0)
    await fetch(`${API}/notifications/read-all`, { method: 'PATCH', headers: authHeaders() })
    load()
  }

  if (!authorized) return null

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{fontSize:26}}>Notifications</h1>
          <p className="af-db-subtitle">{total} total · {unreadCount > 0 ? <strong style={{color:'var(--accent)'}}>{unreadCount} unread</strong> : 'all read'}</p>
        </div>
        {unreadCount > 0 && <button className="af-btn-primary" style={{cursor:'pointer',border:'none'}} onClick={markAllRead}>Mark all read</button>}
      </div>

      <div style={{display:'flex',gap:6,marginBottom:16}}>
        {(['all','unread','read'] as const).map(f => (
          <button key={f} onClick={()=>changeFilter(f)} style={{padding:'7px 14px',borderRadius:8,border:'1px solid',fontSize:12.5,fontWeight:600,cursor:'pointer',fontFamily:'inherit',borderColor:filter===f?'var(--accent)':'var(--border2)',background:filter===f?'rgba(249,115,22,0.12)':'var(--surface)',color:filter===f?'var(--accent)':'var(--muted)'}}>
            {f==='all'?'All':f==='unread'?`Unread${unreadCount>0?` (${unreadCount})`:''}`:'Read'}
          </button>
        ))}
      </div>

      <div style={{background:'var(--surface)',borderRadius:12,border:'1px solid var(--border2)',overflow:'hidden'}}>
        {notifs.length===0 ? (
          <div style={{padding:40,textAlign:'center',color:'var(--muted)',fontSize:13}}>{loading ? 'Loading…' : 'No notifications'}</div>
        ) : notifs.map(n => (
          <div
            key={n.id}
            onClick={()=>markRead(n)}
            style={{
              padding:'14px 18px', borderBottom:'1px solid var(--border2)', cursor: n.read ? 'default' : 'pointer',
              display:'flex', gap:12, alignItems:'flex-start',
              background: n.read ? 'transparent' : 'rgba(249,115,22,0.06)',
            }}
          >
            <span style={{fontSize:18,flexShrink:0}}>{TYPE_ICON[n.type] ?? '🔔'}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2,flexWrap:'wrap'}}>
                <span style={{fontWeight:n.read?600:700,fontSize:13.5}}>{n.title}</span>
                <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:100,background:`${TYPE_COLOR[n.type] ?? '#94a3b8'}18`,color:TYPE_COLOR[n.type] ?? '#94a3b8'}}>{humanizeType(n.type)}</span>
                {!n.read && <span style={{width:6,height:6,borderRadius:'50%',background:'var(--accent)',display:'inline-block'}}/>}
              </div>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>{n.body}</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>{formatDateTime(n.createdAt)}</div>
            </div>
          </div>
        ))}
      </div>

      {!loading && total > PAGE_SIZE && (
        <Pagination page={page} pageSize={PAGE_SIZE} totalItems={total} onPageChange={setPage} />
      )}
    </main>
  )
}
