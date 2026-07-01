'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Log { id:string; user:string; role:string; action:string; module:string; detail:string; ip:string; ts:string }

const SEED: Log[] = [
  { id:'a1',  user:'Super Admin',  role:'super_admin', action:'CREATE', module:'Properties',   detail:'Added property "Sunrise Towers Block B"',               ip:'192.168.1.10', ts:'2026-06-30 09:14' },
  { id:'a2',  user:'Super Admin',  role:'super_admin', action:'UPDATE', module:'Tenants',      detail:'Updated tenant James Carter — unit changed to 4B',      ip:'192.168.1.10', ts:'2026-06-30 09:08' },
  { id:'a3',  user:'Super Admin',  role:'super_admin', action:'CREATE', module:'Payments',     detail:'Recorded rent payment for lease LS0001 — $2,200',       ip:'192.168.1.10', ts:'2026-06-29 16:45' },
  { id:'a4',  user:'Admin Alice',  role:'admin',       action:'UPDATE', module:'Maintenance',  detail:'Maintenance request #MR-0012 marked as Completed',      ip:'192.168.1.25', ts:'2026-06-29 14:32' },
  { id:'a5',  user:'Super Admin',  role:'super_admin', action:'CREATE', module:'Leases',       detail:'New lease LS0009 created for Marco Rivera',             ip:'192.168.1.10', ts:'2026-06-29 11:20' },
  { id:'a6',  user:'Admin Alice',  role:'admin',       action:'DELETE', module:'Expenses',     detail:'Deleted expense "Office supplies" ($120)',               ip:'192.168.1.25', ts:'2026-06-28 17:05' },
  { id:'a7',  user:'Super Admin',  role:'super_admin', action:'LOGIN',  module:'Auth',         detail:'Successful login — Chrome/Windows',                     ip:'192.168.1.10', ts:'2026-06-28 09:00' },
  { id:'a8',  user:'Admin Bob',    role:'admin',       action:'CREATE', module:'Notice Board', detail:'Posted notice "Rent Due Reminder" to All Tenants',      ip:'192.168.1.30', ts:'2026-06-27 15:18' },
  { id:'a9',  user:'Super Admin',  role:'super_admin', action:'UPDATE', module:'Owners',       detail:'Owner Robert Johnson status changed to Inactive',        ip:'192.168.1.10', ts:'2026-06-27 10:44' },
  { id:'a10', user:'Admin Alice',  role:'admin',       action:'CREATE', module:'Utilities',    detail:'June 2026 utility bill added for Sunrise Towers 4B',    ip:'192.168.1.25', ts:'2026-06-26 14:12' },
  { id:'a11', user:'Super Admin',  role:'super_admin', action:'UPDATE', module:'Payroll',      detail:'Payroll for Carlos Mendez approved for June 2026',      ip:'192.168.1.10', ts:'2026-06-25 16:55' },
  { id:'a12', user:'Admin Bob',    role:'admin',       action:'LOGIN',  module:'Auth',         detail:'Successful login — Firefox/Mac',                        ip:'192.168.1.30', ts:'2026-06-25 08:30' },
]

const AC: Record<string,{bg:string;color:string}> = {
  CREATE: { bg:'rgba(34,197,94,0.12)',  color:'#22c55e' },
  UPDATE: { bg:'rgba(59,130,246,0.12)', color:'#3b82f6' },
  DELETE: { bg:'rgba(239,68,68,0.12)',  color:'#ef4444' },
  LOGIN:  { bg:'rgba(100,116,139,0.12)',color:'#94a3b8' },
}
const MI: Record<string,string> = { Properties:'🏢', Tenants:'👥', Payments:'💳', Maintenance:'🔧', Leases:'📋', Expenses:'💰', Utilities:'⚡', Owners:'👤', 'Notice Board':'📌', Payroll:'💼', Auth:'🔑' }

export default function ActivityLogsPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [search, setSearch] = useState('')
  const [actionF, setActionF] = useState('All')
  const [moduleF, setModuleF] = useState('All')

  const modules = ['All', ...Array.from(new Set(SEED.map(l => l.module)))]
  const filtered = SEED.filter(l => {
    const q = search.toLowerCase()
    return (!q || l.user.toLowerCase().includes(q) || l.detail.toLowerCase().includes(q) || l.module.toLowerCase().includes(q))
      && (actionF==='All' || l.action===actionF)
      && (moduleF==='All' || l.module===moduleF)
  })

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{fontSize:26}}>Activity Logs</h1>
          <p className="af-db-subtitle">System audit trail — {SEED.length} events recorded</p>
        </div>
      </div>

      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        <input className="af-prop-search" style={{flex:'1 1 200px'}} placeholder="Search by user, module, detail…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <select value={actionF} onChange={e=>setActionF(e.target.value)} style={{padding:'9px 12px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--surface)',color:'var(--text)',fontSize:13,fontFamily:'inherit',cursor:'pointer'}}>
          {['All','CREATE','UPDATE','DELETE','LOGIN'].map(a=><option key={a}>{a}</option>)}
        </select>
        <select value={moduleF} onChange={e=>setModuleF(e.target.value)} style={{padding:'9px 12px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--surface)',color:'var(--text)',fontSize:13,fontFamily:'inherit',cursor:'pointer'}}>
          {modules.map(m=><option key={m}>{m}</option>)}
        </select>
      </div>

      <div className="af-prop-table-wrap">
        <table className="af-prop-table">
          <thead>
            <tr><th>Timestamp</th><th>User</th><th>Action</th><th>Module</th><th>Detail</th><th>IP</th></tr>
          </thead>
          <tbody>
            {filtered.length===0 && <tr><td colSpan={6} style={{textAlign:'center',color:'var(--muted)',padding:32}}>No logs match your filters</td></tr>}
            {filtered.map(l => (
              <tr key={l.id}>
                <td style={{fontSize:12,color:'var(--muted)',fontVariantNumeric:'tabular-nums',whiteSpace:'nowrap'}}>{l.ts}</td>
                <td>
                  <div style={{fontWeight:650,fontSize:13}}>{l.user}</div>
                  <div style={{fontSize:11,color:'var(--muted)',textTransform:'capitalize'}}>{l.role.replace('_',' ')}</div>
                </td>
                <td><span style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:100,background:AC[l.action]?.bg,color:AC[l.action]?.color}}>{l.action}</span></td>
                <td style={{fontSize:13}}>{MI[l.module]??'📝'} {l.module}</td>
                <td style={{fontSize:13,color:'var(--text2)',maxWidth:300}}>{l.detail}</td>
                <td style={{fontSize:12,color:'var(--muted)',fontFamily:'monospace'}}>{l.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
