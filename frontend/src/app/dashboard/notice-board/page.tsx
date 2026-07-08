'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Pagination, { usePagination } from '@/components/Pagination'

interface Notice {
  id: string
  title: string
  desc: string
  recipient: 'All' | 'Tenants' | 'Owners' | 'Staff'
  date: string
  status: 'active' | 'inactive'
}

const SEED: Notice[] = [
  { id:'n1', title:'Water Supply Interruption', desc:'Water supply will be interrupted on July 5th from 9am to 2pm for maintenance. Please store adequate water.',              recipient:'All',     date:'2026-06-28', status:'active'   },
  { id:'n2', title:'Rent Due Reminder',         desc:'Monthly rent for July 2026 is due by July 5th. Please ensure timely payment to avoid late fees.',                       recipient:'Tenants', date:'2026-06-25', status:'active'   },
  { id:'n3', title:'Lobby Renovation',          desc:'The main lobby will undergo renovation from July 10-15. Please use the side entrance during this period.',               recipient:'All',     date:'2026-06-20', status:'active'   },
  { id:'n4', title:'Owner Meeting',             desc:'Quarterly owners meeting scheduled for July 12th at 3:00 PM in Conference Room B. Attendance is requested.',             recipient:'Owners',  date:'2026-06-15', status:'inactive' },
]

const RECIPIENT_COLORS: Record<string, { bg: string; color: string }> = {
  All:     { bg:'rgba(59,130,246,0.12)',  color:'#3b82f6' },
  Tenants: { bg:'rgba(34,197,94,0.12)',   color:'#22c55e' },
  Owners:  { bg:'rgba(168,85,247,0.12)',  color:'#a855f7' },
  Staff:   { bg:'rgba(249,115,22,0.12)',  color:'#f97316' },
}

const EMPTY_FORM = { title:'', desc:'', recipient:'All' as Notice['recipient'], status:'active' as Notice['status'] }

export default function NoticeBoardPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [notices, setNotices]   = useState<Notice[]>(SEED)
  const [filter, setFilter]     = useState<'All Types'|'All'|'Tenants'|'Owners'|'Staff'>('All Types')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]   = useState<Notice | null>(null)
  const [form, setForm]         = useState(EMPTY_FORM)

  const filtered = filter === 'All Types' ? notices : notices.filter(n => n.recipient === filter)
  const { page, setPage, pageSize, pageItems } = usePagination(filtered, 10)

  const openNew  = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (n: Notice) => { setEditing(n); setForm({ title:n.title, desc:n.desc, recipient:n.recipient, status:n.status }); setShowModal(true) }

  const save = () => {
    if (!form.title.trim() || !form.desc.trim()) return
    if (editing) {
      setNotices(ns => ns.map(n => n.id === editing.id ? { ...n, ...form } : n))
    } else {
      setNotices(ns => [...ns, { id:`n${Date.now()}`, date: new Date().toISOString().slice(0,10), ...form }])
    }
    setShowModal(false)
  }

  const del = (id: string) => setNotices(ns => ns.filter(n => n.id !== id))
  const sf  = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(f => ({ ...f, [k]: v }))

  const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + '…' : s

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{fontSize:26}}>Notice Board</h1>
          <p className="af-db-subtitle">{notices.length} notice{notices.length !== 1 ? 's' : ''} total · {notices.filter(n=>n.status==='active').length} active</p>
        </div>
        <button className="af-btn-primary" onClick={openNew} style={{cursor:'pointer',border:'none'}}>+ Post Notice</button>
      </div>

      {/* Filter tabs */}
      <div style={{display:'flex',gap:6,marginBottom:24,flexWrap:'wrap'}}>
        {(['All Types','All','Tenants','Owners','Staff'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{padding:'7px 14px',borderRadius:8,border:'1px solid',fontSize:12.5,fontWeight:600,cursor:'pointer',fontFamily:'inherit',borderColor:filter===f?'var(--accent)':'var(--border2)',background:filter===f?'rgba(249,115,22,0.12)':'var(--surface)',color:filter===f?'var(--accent)':'var(--muted)'}}>
            {f}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
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
                    <span style={{fontSize:11,color:'var(--muted)'}}>{n.date}</span>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button className="af-prop-act edit" onClick={() => openEdit(n)}>Edit</button>
                    <button className="af-prop-act del"  onClick={() => del(n.id)}>Delete</button>
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

      {/* Post / Edit Notice Modal */}
      {showModal && (
        <div className="af-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="af-modal" style={{maxWidth:520}} onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">{editing ? 'Edit Notice' : 'Post Notice'}</h2>
            <div className="af-modal-form">
              <div className="af-field">
                <label>Title</label>
                <input value={form.title} onChange={e => sf('title', e.target.value)} placeholder="Notice title…"/>
              </div>
              <div className="af-field">
                <label>Description</label>
                <textarea
                  value={form.desc}
                  onChange={e => sf('desc', e.target.value)}
                  placeholder="Write the notice content here…"
                  rows={4}
                  style={{width:'100%',boxSizing:'border-box',resize:'vertical',fontFamily:'inherit',fontSize:13,padding:'9px 12px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--surface2)',color:'var(--text)',outline:'none'}}
                />
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="af-field">
                  <label>Recipient</label>
                  <select className="af-select" value={form.recipient} onChange={e => sf('recipient', e.target.value as Notice['recipient'])}>
                    <option value="All">All</option>
                    <option value="Tenants">Tenants</option>
                    <option value="Owners">Owners</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
                <div className="af-field">
                  <label>Status</label>
                  <select className="af-select" value={form.status} onChange={e => sf('status', e.target.value as Notice['status'])}>
                    <option value="active">Active</option>
                    <option value="inactive">Draft</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:22,justifyContent:'flex-end'}}>
              <button className="af-btn-secondary" style={{cursor:'pointer'}} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="af-auth-submit" style={{width:'auto',padding:'10px 24px'}} onClick={save}>
                {editing ? 'Save changes' : 'Post notice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
