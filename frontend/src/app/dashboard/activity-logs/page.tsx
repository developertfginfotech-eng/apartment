'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Log { id:number; description:string; user_name:string; role_name:string|null; created_at:string }

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
})

export default function ActivityLogsPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [logs, setLogs]       = useState<Log[]>([])
  const [roles, setRoles]     = useState<string[]>([])
  const [total, setTotal]     = useState(0)
  const [pages, setPages]     = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const [page, setPage]     = useState(1)
  const [limit, setLimit]   = useState(50)
  const [role, setRole]     = useState('')
  const [search, setSearch] = useState('')

  const fetchLogs = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (role)   params.set('role', role)
      if (search) params.set('search', search)
      const res  = await fetch(`${API}/activity-log?${params}`, { headers: authHeaders() })
      const data = await res.json()
      setLogs(data.data ?? [])
      setTotal(data.total ?? 0)
      setPages(data.pages ?? 1)
    } catch { setError('Failed to load activity logs') }
    finally { setLoading(false) }
  }, [page, limit, role, search])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  useEffect(() => {
    fetch(`${API}/activity-log/roles`, { headers: authHeaders() })
      .then(r => r.json()).then(d => Array.isArray(d) && setRoles(d.map((r:{name:string})=>r.name))).catch(()=>{})
  }, [])

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{marginBottom:20}}>
        <div>
          <h1 className="af-db-greeting" style={{fontSize:26}}>Activity Logs</h1>
          <p className="af-db-subtitle">System audit trail — {total} events recorded</p>
        </div>
      </div>

      <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:12}}>
        <div className="af-field" style={{margin:0,minWidth:200}}>
          <label style={{fontSize:11.5}}>Select Role</label>
          <select className="af-select" value={role} onChange={e=>{setRole(e.target.value);setPage(1)}}>
            <option value="">-- All Roles --</option>
            {roles.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'var(--muted)'}}>
            Show
            <select value={limit} onChange={e=>{setLimit(Number(e.target.value));setPage(1)}}
              style={{background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:7,color:'var(--text)',fontSize:11.5,padding:'5px 8px',fontFamily:'inherit',cursor:'pointer'}}>
              {[10,25,50,100].map(v=><option key={v} value={v}>{v}</option>)}
            </select>
            entries
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'var(--muted)'}}>
            Search:
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="User or description…"
              style={{background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:8,padding:'6px 12px',color:'var(--text)',fontSize:13,fontFamily:'inherit',width:200}}/>
          </div>
        </div>
      </div>

      {error && <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,padding:'10px 16px',marginBottom:16,color:'#ef4444',fontSize:13}}>{error}</div>}

      {loading ? (
        <div style={{textAlign:'center',padding:'60px 0',color:'var(--muted)'}}>Loading…</div>
      ) : (
        <div className="af-prop-table-wrap">
          <table className="af-prop-table">
            <thead><tr><th>#</th><th>User</th><th>Role</th><th>Date</th><th>Description</th></tr></thead>
            <tbody>
              {logs.length===0 ? (
                <tr><td colSpan={5} style={{textAlign:'center',color:'var(--muted)',padding:32}}>No logs match your filters</td></tr>
              ) : logs.map((l,i) => (
                <tr key={l.id}>
                  <td style={{color:'var(--muted)',fontSize:12}}>{(page-1)*limit+i+1}</td>
                  <td style={{fontWeight:650,fontSize:13}}>{l.user_name?.trim() || '—'}</td>
                  <td style={{fontSize:13,color:'var(--text2)'}}>{l.role_name || '—'}</td>
                  <td style={{fontSize:12,color:'var(--muted)',fontVariantNumeric:'tabular-nums',whiteSpace:'nowrap'}}>{l.created_at}</td>
                  <td style={{fontSize:13,color:'var(--text2)'}}>{l.description?.trim()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:16,flexWrap:'wrap'}}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
            style={{padding:'6px 12px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--surface2)',color:'var(--text)',cursor:page===1?'not-allowed':'pointer',opacity:page===1?0.4:1,fontFamily:'inherit',fontSize:13}}>‹</button>
          <span style={{fontSize:13,color:'var(--muted)',padding:'0 8px'}}>Page {page} of {pages}</span>
          <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages}
            style={{padding:'6px 12px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--surface2)',color:'var(--text)',cursor:page===pages?'not-allowed':'pointer',opacity:page===pages?0.4:1,fontFamily:'inherit',fontSize:13}}>›</button>
          <span style={{fontSize:12,color:'var(--muted)',marginLeft:8}}>Showing {(page-1)*limit+1}–{Math.min(page*limit,total)} of {total} entries</span>
        </div>
      )}
    </main>
  )
}
