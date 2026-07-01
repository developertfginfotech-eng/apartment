'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [general, setGeneral] = useState({ companyName:'Apartment Management', email:'admin@apartment.local', phone:'+1-555-0100', address:'123 Main Street, New York, NY 10001', currency:'USD', timezone:'America/New_York' })
  const [notif, setNotif] = useState({ rentDue:true, maintenance:true, leaseExpiry:true, paymentReceived:true, noticeSent:false })
  const [saved, setSaved] = useState(false)

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  const F = ({ label, value, onChange, type='text', disabled=false }: { label:string; value:string; onChange:(v:string)=>void; type?:string; disabled?:boolean }) => (
    <div className="af-field">
      <label>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} disabled={disabled} style={disabled?{opacity:0.5,cursor:'not-allowed'}:undefined}/>
    </div>
  )

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{fontSize:26}}>Settings</h1>
          <p className="af-db-subtitle">System configuration and preferences</p>
        </div>
        <button className="af-btn-primary" style={{cursor:'pointer',border:'none'}} onClick={save}>
          {saved ? '✓ Saved' : 'Save changes'}
        </button>
      </div>

      {saved && (
        <div style={{background:'rgba(34,197,94,0.12)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:10,padding:'12px 16px',fontSize:13.5,color:'#22c55e',marginBottom:20,fontWeight:600}}>
          ✓ Settings saved successfully
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:24,maxWidth:720}}>

        {/* General */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:12,padding:22}}>
          <h2 style={{fontSize:15,fontWeight:750,marginBottom:18,paddingBottom:12,borderBottom:'1px solid var(--border2)'}}>General Information</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <F label="Company name" value={general.companyName} onChange={v=>setGeneral(g=>({...g,companyName:v}))}/>
            <F label="Contact email" value={general.email} onChange={v=>setGeneral(g=>({...g,email:v}))} type="email"/>
            <F label="Phone" value={general.phone} onChange={v=>setGeneral(g=>({...g,phone:v}))}/>
            <F label="Currency" value={general.currency} onChange={v=>setGeneral(g=>({...g,currency:v}))}/>
            <div className="af-field" style={{gridColumn:'span 2'}}>
              <label>Office address</label>
              <input value={general.address} onChange={e=>setGeneral(g=>({...g,address:e.target.value}))}/>
            </div>
            <div className="af-field">
              <label>Timezone</label>
              <select className="af-select" value={general.timezone} onChange={e=>setGeneral(g=>({...g,timezone:e.target.value}))}>
                {['America/New_York','America/Chicago','America/Los_Angeles','Europe/London','Asia/Dubai','Asia/Singapore','Asia/Tokyo'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:12,padding:22}}>
          <h2 style={{fontSize:15,fontWeight:750,marginBottom:18,paddingBottom:12,borderBottom:'1px solid var(--border2)'}}>Notifications</h2>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {([
              { key:'rentDue',          label:'Rent due reminders',      desc:'Notify when tenant rent payment is approaching due date' },
              { key:'maintenance',      label:'Maintenance updates',      desc:'Notify when a maintenance request is created or updated' },
              { key:'leaseExpiry',      label:'Lease expiry alerts',      desc:'Notify when a lease is within 60 days of expiry' },
              { key:'paymentReceived',  label:'Payment received',         desc:'Notify when a rent or utility payment is recorded' },
              { key:'noticeSent',       label:'Notice board posts',       desc:'Notify when a new notice is posted to the board' },
            ] as { key: keyof typeof notif; label:string; desc:string }[]).map(n => (
              <div key={n.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:'var(--surface2)',borderRadius:8}}>
                <div>
                  <div style={{fontSize:13.5,fontWeight:600}}>{n.label}</div>
                  <div style={{fontSize:12.5,color:'var(--muted)',marginTop:2}}>{n.desc}</div>
                </div>
                <button
                  onClick={()=>setNotif(p=>({...p,[n.key]:!p[n.key]}))}
                  style={{width:42,height:24,borderRadius:12,border:'none',cursor:'pointer',position:'relative',background:notif[n.key]?'var(--accent)':'var(--border2)',transition:'background 0.2s',flexShrink:0}}
                >
                  <span style={{position:'absolute',top:3,left:notif[n.key]?20:3,width:18,height:18,borderRadius:'50%',background:'white',transition:'left 0.2s',display:'block'}}/>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Account */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:12,padding:22}}>
          <h2 style={{fontSize:15,fontWeight:750,marginBottom:18,paddingBottom:12,borderBottom:'1px solid var(--border2)'}}>Account</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <F label="Email (login)" value="admin@apartment.local" onChange={()=>{}} disabled/>
            <F label="Role" value="Super Admin" onChange={()=>{}} disabled/>
            <div className="af-field">
              <label>New password</label>
              <input type="password" placeholder="Leave blank to keep current" />
            </div>
            <div className="af-field">
              <label>Confirm password</label>
              <input type="password" placeholder="Repeat new password"/>
            </div>
          </div>
          <button className="af-btn-secondary" style={{cursor:'pointer',marginTop:12}}>Update password</button>
        </div>

      </div>
    </main>
  )
}
