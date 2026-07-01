'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Lease {
  id: string
  tenant: string
  unit: string
  property: string
  startDate: string
  endDate: string
  rent: number
  deposit: number
  status: 'active' | 'expiring' | 'expired' | 'draft'
}

const SEED: Lease[] = [
  { id:'l1', tenant:'James Carter',  unit:'4B', property:'Sunrise Towers',    startDate:'2024-01-01', endDate:'2025-12-31', rent:2200, deposit:4400, status:'active' },
  { id:'l2', tenant:'Priya Sharma',  unit:'2A', property:'Green Valley Block', startDate:'2024-04-01', endDate:'2025-09-30', rent:1850, deposit:3700, status:'expiring' },
  { id:'l3', tenant:'Marco Rivera',  unit:'7C', property:'Sunrise Towers',    startDate:'2025-07-01', endDate:'2026-06-30', rent:1950, deposit:3900, status:'draft' },
  { id:'l4', tenant:'Aisha Okonkwo', unit:'1D', property:'Metro Heights',     startDate:'2024-02-01', endDate:'2026-01-31', rent:2100, deposit:4200, status:'active' },
  { id:'l5', tenant:'Liam Thompson', unit:'5F', property:'Green Valley Block', startDate:'2023-01-01', endDate:'2024-12-31', rent:2000, deposit:4000, status:'expired' },
]

const STA: Record<string, { bg: string; color: string; label: string }> = {
  active:   { bg:'rgba(34,197,94,0.12)',  color:'#22c55e', label:'Active' },
  expiring: { bg:'rgba(249,115,22,0.12)', color:'#f97316', label:'Expiring soon' },
  expired:  { bg:'rgba(239,68,68,0.12)',  color:'#ef4444', label:'Expired' },
  draft:    { bg:'rgba(100,116,139,0.12)',color:'#64748b', label:'Draft' },
}

export default function LeasesPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [leases, setLeases] = useState<Lease[]>(SEED)
  const [filter, setFilter] = useState<'all'|'active'|'expiring'|'expired'|'draft'>('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ tenant:'', unit:'', property:'', startDate:'', endDate:'', rent:'', deposit:'' })

  const filtered = filter === 'all' ? leases : leases.filter(l => l.status === filter)

  const save = () => {
    if (!form.tenant || !form.unit) return
    setLeases(ls => [...ls, { id:`l${Date.now()}`, ...form, rent:+form.rent||0, deposit:+form.deposit||0, status:'draft' }])
    setShowForm(false)
    setForm({ tenant:'', unit:'', property:'', startDate:'', endDate:'', rent:'', deposit:'' })
  }

  const daysLeft = (end: string) => { const d = Math.ceil((new Date(end).getTime() - Date.now()) / 86400000); return d }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div><h1 className="af-db-greeting" style={{fontSize:26}}>Leases</h1><p className="af-db-subtitle">{leases.filter(l=>l.status==='active').length} active · {leases.filter(l=>l.status==='expiring').length} expiring soon</p></div>
        <button className="af-btn-primary" onClick={()=>setShowForm(true)} style={{cursor:'pointer',border:'none'}}>+ New Lease</button>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:18}}>
        {(['all','active','expiring','expired','draft'] as const).map(s=>(
          <button key={s} onClick={()=>setFilter(s)} style={{padding:'7px 13px',borderRadius:8,border:'1px solid',fontSize:12.5,fontWeight:600,cursor:'pointer',fontFamily:'inherit',borderColor:filter===s?'var(--accent)':'var(--border2)',background:filter===s?'rgba(249,115,22,0.12)':'var(--surface)',color:filter===s?'var(--accent)':'var(--muted)'}}>
            {s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}
      </div>

      <div className="af-prop-table-wrap">
        <table className="af-prop-table">
          <thead><tr><th>Tenant</th><th>Unit</th><th>Property</th><th>Period</th><th>Monthly rent</th><th>Days left</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map(l => {
              const days = daysLeft(l.endDate)
              return (
                <tr key={l.id}>
                  <td style={{fontWeight:650}}>{l.tenant}</td>
                  <td><span className="af-prop-badge type">{l.unit}</span></td>
                  <td style={{fontSize:13,color:'var(--muted)'}}>{l.property}</td>
                  <td style={{fontSize:12.5}}>{l.startDate} → {l.endDate}</td>
                  <td style={{fontWeight:700,fontVariantNumeric:'tabular-nums'}}>${l.rent.toLocaleString()}</td>
                  <td style={{fontSize:13,color:days<60&&days>0?'#f97316':days<=0?'#ef4444':'var(--text2)',fontWeight:days<60?650:400}}>
                    {days > 0 ? `${days}d` : 'Ended'}
                  </td>
                  <td><span style={{fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:100,background:STA[l.status].bg,color:STA[l.status].color}}>{STA[l.status].label}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="af-modal-overlay" onClick={()=>setShowForm(false)}>
          <div className="af-modal" onClick={e=>e.stopPropagation()}>
            <h2 className="af-modal-title">New Lease</h2>
            <div className="af-modal-form">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="af-field"><label>Tenant name</label><input value={form.tenant} onChange={e=>setForm(f=>({...f,tenant:e.target.value}))} placeholder="James Carter"/></div>
                <div className="af-field"><label>Unit</label><input value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} placeholder="4B"/></div>
                <div className="af-field" style={{gridColumn:'span 2'}}><label>Property</label><input value={form.property} onChange={e=>setForm(f=>({...f,property:e.target.value}))} placeholder="Sunrise Towers"/></div>
                <div className="af-field"><label>Start date</label><input type="date" value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))}/></div>
                <div className="af-field"><label>End date</label><input type="date" value={form.endDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))}/></div>
                <div className="af-field"><label>Monthly rent ($)</label><input type="number" value={form.rent} onChange={e=>setForm(f=>({...f,rent:e.target.value}))} placeholder="2200"/></div>
                <div className="af-field"><label>Security deposit ($)</label><input type="number" value={form.deposit} onChange={e=>setForm(f=>({...f,deposit:e.target.value}))} placeholder="4400"/></div>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:22,justifyContent:'flex-end'}}>
              <button className="af-btn-secondary" style={{cursor:'pointer'}} onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="af-auth-submit" style={{width:'auto',padding:'10px 24px'}} onClick={save}>Create lease</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
