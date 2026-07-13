'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Msg { id:string; from:string; role:'tenant'|'owner'|'staff'; to?:string; subject:string; body:string; date:string; read:boolean }
interface Recipient { name:string; role:'tenant'|'owner' }

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const ROLE_COLOR: Record<string,string> = { tenant:'#3b82f6', owner:'#22c55e', staff:'#f97316' }

export default function MessagesPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [messages, setMessages] = useState<Msg[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Msg|null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [filter, setFilter] = useState<'all'|'unread'|'read'>('all')
  const [form, setForm] = useState({ to:'', subject:'', body:'' })
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('apt_token')}` })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/message`, { headers: authHeaders() })
      if (res.ok) setMessages(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRecipients = useCallback(async () => {
    try {
      const [rentersRes, ownersRes] = await Promise.all([
        fetch(`${API}/renters`, { headers: authHeaders() }),
        fetch(`${API}/landlords`, { headers: authHeaders() }),
      ])
      const renters = rentersRes.ok ? await rentersRes.json() : []
      const owners  = ownersRes.ok ? await ownersRes.json() : []
      const tenantList: Recipient[] = renters
        .map((r: any) => ({ name: (r.name || '').trim(), role: 'tenant' as const }))
        .filter((r: Recipient) => r.name)
      const ownerList: Recipient[] = owners
        .map((o: any) => ({ name: `${o.first_name ?? ''} ${o.last_name ?? ''}`.trim(), role: 'owner' as const }))
        .filter((r: Recipient) => r.name)
      setRecipients([...tenantList, ...ownerList])
    } catch { /* suggestions are a nice-to-have — silently skip on failure */ }
  }, [])

  useEffect(() => { load(); loadRecipients() }, [load, loadRecipients])

  const matchingRecipients = form.to.trim()
    ? recipients.filter(r => r.name.toLowerCase().includes(form.to.trim().toLowerCase())).slice(0, 8)
    : []

  const unread = messages.filter(m => !m.read).length
  const filtered = messages.filter(m => filter==='all' ? true : filter==='unread' ? !m.read : m.read)

  const open = async (m: Msg) => {
    setSelected(m)
    setShowCompose(false)
    setForm({ to:'', subject:'', body:'' })
    if (!m.read) {
      setMessages(ms => ms.map(x => x.id===m.id ? {...x, read:true} : x))
      await fetch(`${API}/message/${m.id}/read`, { method: 'PATCH', headers: authHeaders() })
    }
  }

  const send = async () => {
    if (!form.to || !form.subject || !form.body) return
    const res = await fetch(`${API}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ from: 'You', role: 'staff', to: form.to, subject: form.subject, body: form.body }),
    })
    if (res.ok) {
      const created = await res.json()
      setMessages(ms => [created, ...ms])
    }
    setShowCompose(false); setForm({ to:'', subject:'', body:'' })
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{fontSize:26}}>Messages</h1>
          <p className="af-db-subtitle">{messages.length} total · {unread > 0 ? <strong style={{color:'var(--accent)'}}>{unread} unread</strong> : 'all read'}</p>
        </div>
        <button className="af-btn-primary" style={{cursor:'pointer',border:'none'}} onClick={()=>setShowCompose(true)}>+ Compose</button>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:16}}>
        {(['all','unread','read'] as const).map(f => (
          <button key={f} onClick={()=>setFilter(f)} style={{padding:'7px 14px',borderRadius:8,border:'1px solid',fontSize:12.5,fontWeight:600,cursor:'pointer',fontFamily:'inherit',borderColor:filter===f?'var(--accent)':'var(--border2)',background:filter===f?'rgba(249,115,22,0.12)':'var(--surface)',color:filter===f?'var(--accent)':'var(--muted)'}}>
            {f==='all'?'All':f==='unread'?`Unread${unread>0?` (${unread})`:'`'}`:'Read'}
          </button>
        ))}
      </div>

      <div style={{display:'flex',gap:16,height:480}}>
        <div style={{width:300,flexShrink:0,overflowY:'auto',background:'var(--surface)',borderRadius:12,border:'1px solid var(--border2)'}}>
          {filtered.length===0 && <div style={{padding:32,textAlign:'center',color:'var(--muted)',fontSize:13}}>{loading ? 'Loading…' : 'No messages'}</div>}
          {filtered.map(m => (
            <div key={m.id} onClick={()=>open(m)} style={{padding:'12px 14px',borderBottom:'1px solid var(--border2)',cursor:'pointer',background:selected?.id===m.id?'var(--surface2)':m.read?'transparent':'rgba(249,115,22,0.06)'}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:100,background:`${ROLE_COLOR[m.role]}18`,color:ROLE_COLOR[m.role],textTransform:'capitalize'}}>{m.role}</span>
                {!m.read && <span style={{width:6,height:6,borderRadius:'50%',background:'var(--accent)',display:'inline-block',marginLeft:'auto'}}/>}
              </div>
              <div style={{fontWeight:m.read?500:700,fontSize:13,marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{m.from}</div>
              <div style={{fontSize:12,color:'var(--muted)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{m.subject}</div>
              <div style={{fontSize:11,color:'var(--muted)',marginTop:3}}>{m.date}</div>
            </div>
          ))}
        </div>

        <div style={{flex:1,background:'var(--surface)',borderRadius:12,border:'1px solid var(--border2)',padding:24,overflowY:'auto'}}>
          {!selected ? (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',flexDirection:'column',gap:8,color:'var(--muted)'}}>
              <div style={{fontSize:32}}>✉️</div>
              <div style={{fontSize:14}}>Select a message to read</div>
            </div>
          ) : (
            <>
              <h2 style={{fontSize:17,fontWeight:750,marginBottom:8}}>{selected.subject}</h2>
              <div style={{display:'flex',gap:14,fontSize:12.5,color:'var(--muted)',marginBottom:20}}>
                <span>From: <strong style={{color:'var(--text)'}}>{selected.from}</strong></span>
                {selected.to && <span>To: <strong style={{color:'var(--text)'}}>{selected.to}</strong></span>}
                <span style={{textTransform:'capitalize'}}>Role: <strong style={{color:ROLE_COLOR[selected.role]}}>{selected.role}</strong></span>
                <span>Date: {selected.date}</span>
              </div>
              <div style={{borderTop:'1px solid var(--border2)',paddingTop:18,fontSize:14,lineHeight:1.8,color:'var(--text2)'}}>{selected.body}</div>
              <button className="af-btn-primary" style={{cursor:'pointer',border:'none',fontSize:13,marginTop:20}} onClick={()=>{ setForm(f=>({...f,subject:`Re: ${selected.subject}`})); setShowCompose(true) }}>Reply</button>
            </>
          )}
        </div>
      </div>

      {showCompose && (
        <div className="af-modal-overlay" onClick={()=>setShowCompose(false)}>
          <div className="af-modal" onClick={e=>e.stopPropagation()}>
            <h2 className="af-modal-title">{selected?`Reply to ${selected.from}`:'New Message'}</h2>
            <div className="af-modal-form">
              <div className="af-field" style={{position:'relative'}}>
                <label>To</label>
                <input
                  value={form.to}
                  onChange={e=>{ setForm(f=>({...f,to:e.target.value})); setShowSuggestions(true) }}
                  onFocus={()=>setShowSuggestions(true)}
                  onBlur={()=>setTimeout(()=>setShowSuggestions(false), 150)}
                  placeholder="Start typing a renter or owner name…"
                  autoComplete="off"
                />
                {showSuggestions && matchingRecipients.length > 0 && (
                  <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:10,marginTop:4,background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:8,maxHeight:180,overflowY:'auto',boxShadow:'0 8px 24px rgba(0,0,0,0.25)'}}>
                    {matchingRecipients.map((r,i) => (
                      <div
                        key={`${r.name}-${i}`}
                        onMouseDown={()=>{ setForm(f=>({...f,to:r.name})); setShowSuggestions(false) }}
                        style={{padding:'8px 12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:13,borderBottom:i<matchingRecipients.length-1?'1px solid var(--border2)':'none'}}
                      >
                        <span>{r.name}</span>
                        <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:100,background:`${ROLE_COLOR[r.role]}18`,color:ROLE_COLOR[r.role],textTransform:'capitalize'}}>{r.role}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="af-field"><label>Subject</label><input value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} placeholder="Subject"/></div>
              <div className="af-field"><label>Message</label><textarea value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} placeholder="Type your message…" style={{resize:'vertical',minHeight:120}}/></div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:22,justifyContent:'flex-end'}}>
              <button className="af-btn-secondary" style={{cursor:'pointer'}} onClick={()=>setShowCompose(false)}>Cancel</button>
              <button className="af-auth-submit" style={{width:'auto',padding:'10px 24px'}} onClick={send}>Send</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
