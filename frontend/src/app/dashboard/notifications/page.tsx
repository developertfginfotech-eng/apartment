'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Notif { id:string; type:string; title:string; body:string; read:boolean; createdAt:string }

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const TYPE_COLOR: Record<string,string> = { message:'#3b82f6', admin:'#f97316' }
const TYPE_ICON: Record<string,string> = { message:'✉️', admin:'🛡️' }

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
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all'|'unread'|'read'>('all')

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('apt_token')}` })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/notifications`, { headers: authHeaders() })
      if (res.ok) setNotifs(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (authorized) load() }, [authorized, load])

  const unread = notifs.filter(n => !n.read).length
  const filtered = notifs.filter(n => filter==='all' ? true : filter==='unread' ? !n.read : n.read)

  const markRead = async (n: Notif) => {
    if (n.read) return
    setNotifs(ns => ns.map(x => x.id===n.id ? {...x, read:true} : x))
    await fetch(`${API}/notifications/${n.id}/read`, { method: 'PATCH', headers: authHeaders() })
  }

  const markAllRead = async () => {
    setNotifs(ns => ns.map(n => ({...n, read:true})))
    await fetch(`${API}/notifications/read-all`, { method: 'PATCH', headers: authHeaders() })
  }

  if (!authorized) return null

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{fontSize:26}}>Notifications</h1>
          <p className="af-db-subtitle">{notifs.length} total · {unread > 0 ? <strong style={{color:'var(--accent)'}}>{unread} unread</strong> : 'all read'}</p>
        </div>
        {unread > 0 && <button className="af-btn-primary" style={{cursor:'pointer',border:'none'}} onClick={markAllRead}>Mark all read</button>}
      </div>

      <div style={{display:'flex',gap:6,marginBottom:16}}>
        {(['all','unread','read'] as const).map(f => (
          <button key={f} onClick={()=>setFilter(f)} style={{padding:'7px 14px',borderRadius:8,border:'1px solid',fontSize:12.5,fontWeight:600,cursor:'pointer',fontFamily:'inherit',borderColor:filter===f?'var(--accent)':'var(--border2)',background:filter===f?'rgba(249,115,22,0.12)':'var(--surface)',color:filter===f?'var(--accent)':'var(--muted)'}}>
            {f==='all'?'All':f==='unread'?`Unread${unread>0?` (${unread})`:''}`:'Read'}
          </button>
        ))}
      </div>

      <div style={{background:'var(--surface)',borderRadius:12,border:'1px solid var(--border2)',overflow:'hidden'}}>
        {filtered.length===0 ? (
          <div style={{padding:40,textAlign:'center',color:'var(--muted)',fontSize:13}}>{loading ? 'Loading…' : 'No notifications'}</div>
        ) : filtered.map(n => (
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
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                <span style={{fontWeight:n.read?600:700,fontSize:13.5}}>{n.title}</span>
                <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:100,background:`${TYPE_COLOR[n.type] ?? '#94a3b8'}18`,color:TYPE_COLOR[n.type] ?? '#94a3b8',textTransform:'capitalize'}}>{n.type}</span>
                {!n.read && <span style={{width:6,height:6,borderRadius:'50%',background:'var(--accent)',display:'inline-block'}}/>}
              </div>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>{n.body}</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>{new Date(n.createdAt).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
