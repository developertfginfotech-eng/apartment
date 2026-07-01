'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface UtilityBill {
  id: string
  property: string
  floor: string
  unit: string
  renter: string
  month: string
  water: number
  electric: number
  gas: number
  security: number
  other: number
  paid: boolean
  date: string
}

const SEED: UtilityBill[] = [
  { id:'u1', property:'Sunrise Towers',    floor:'Floor 4', unit:'4B', renter:'James Carter',   month:'June 2026', water:85, electric:142, gas:38, security:20, other:0,  paid:false, date:'2026-06-01' },
  { id:'u2', property:'Sunrise Towers',    floor:'Floor 2', unit:'2A', renter:'Priya Sharma',   month:'June 2026', water:72, electric:118, gas:29, security:20, other:15, paid:true,  date:'2026-06-01' },
  { id:'u3', property:'Green Valley Block',floor:'Floor 1', unit:'1D', renter:'Aisha Okonkwo',  month:'June 2026', water:95, electric:165, gas:44, security:20, other:0,  paid:false, date:'2026-06-01' },
  { id:'u4', property:'Green Valley Block',floor:'Floor 5', unit:'5F', renter:'Liam Thompson',  month:'May 2026',  water:88, electric:130, gas:35, security:20, other:0,  paid:true,  date:'2026-05-01' },
  { id:'u5', property:'Metro Heights',     floor:'Floor 7', unit:'7C', renter:'Marco Rivera',   month:'June 2026', water:78, electric:155, gas:40, security:20, other:0,  paid:false, date:'2026-06-01' },
]

const total = (b: UtilityBill) => b.water + b.electric + b.gas + b.security + b.other

const EMPTY_FORM = { property:'', floor:'', unit:'', renter:'', month:'', water:'', electric:'', gas:'', security:'', other:'', date:'' }

export default function UtilitiesPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [bills, setBills]       = useState<UtilityBill[]>(SEED)
  const [filter, setFilter]     = useState<'all'|'paid'|'unpaid'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]   = useState<UtilityBill | null>(null)
  const [form, setForm]         = useState(EMPTY_FORM)

  const filtered = filter === 'all' ? bills : bills.filter(b => filter === 'paid' ? b.paid : !b.paid)

  const totalBillsThisMonth = bills.filter(b => b.month.includes('June 2026')).reduce((s, b) => s + total(b), 0)
  const paidCount   = bills.filter(b => b.paid).length
  const unpaidCount = bills.filter(b => !b.paid).length
  const paidAmount  = bills.filter(b => b.paid).reduce((s, b) => s + total(b), 0)
  const unpaidAmount= bills.filter(b => !b.paid).reduce((s, b) => s + total(b), 0)

  const openNew  = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (b: UtilityBill) => {
    setEditing(b)
    setForm({ property:b.property, floor:b.floor, unit:b.unit, renter:b.renter, month:b.month, water:String(b.water), electric:String(b.electric), gas:String(b.gas), security:String(b.security), other:String(b.other), date:b.date })
    setShowModal(true)
  }

  const save = () => {
    if (!form.property || !form.unit || !form.renter) return
    const parsed = {
      property: form.property, floor: form.floor, unit: form.unit, renter: form.renter,
      month: form.month, date: form.date,
      water: Number(form.water) || 0, electric: Number(form.electric) || 0,
      gas: Number(form.gas) || 0, security: Number(form.security) || 0,
      other: Number(form.other) || 0,
    }
    if (editing) {
      setBills(bs => bs.map(b => b.id === editing.id ? { ...b, ...parsed } : b))
    } else {
      setBills(bs => [...bs, { id:`u${Date.now()}`, paid: false, ...parsed }])
    }
    setShowModal(false)
  }

  const del     = (id: string) => setBills(bs => bs.filter(b => b.id !== id))
  const markPaid= (id: string) => setBills(bs => bs.map(b => b.id === id ? { ...b, paid: true } : b))

  const sf = (v: string, k: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{fontSize:26}}>Utility Bills</h1>
          <p className="af-db-subtitle">Water, electricity &amp; gas billing per unit</p>
        </div>
        <button className="af-btn-primary" onClick={openNew} style={{cursor:'pointer',border:'none'}}>+ Add Bill</button>
      </div>

      {/* Summary cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:28}}>
        {[
          { label:'Total Bills (June)',  value:`$${totalBillsThisMonth.toLocaleString()}`, sub:`${bills.filter(b=>b.month.includes('June 2026')).length} records`, color:'var(--accent)' },
          { label:`Paid (${paidCount})`,    value:`$${paidAmount.toLocaleString()}`,           sub:'Cleared',         color:'#22c55e' },
          { label:`Unpaid (${unpaidCount})`,value:`$${unpaidAmount.toLocaleString()}`,          sub:'Outstanding',     color:'#ef4444' },
        ].map(s => (
          <div key={s.label} style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:14,padding:'20px 22px'}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',color:'var(--muted)',marginBottom:8}}>{s.label}</div>
            <div style={{fontSize:26,fontWeight:820,letterSpacing:'-0.03em',color:s.color,fontVariantNumeric:'tabular-nums'}}>{s.value}</div>
            <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Filter buttons */}
      <div style={{display:'flex',gap:6,marginBottom:18}}>
        {(['all','unpaid','paid'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{padding:'7px 14px',borderRadius:8,border:'1px solid',fontSize:12.5,fontWeight:600,cursor:'pointer',fontFamily:'inherit',borderColor:filter===f?'var(--accent)':'var(--border2)',background:filter===f?'rgba(249,115,22,0.12)':'var(--surface)',color:filter===f?'var(--accent)':'var(--muted)'}}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="af-prop-table-wrap">
        <table className="af-prop-table">
          <thead>
            <tr>
              <th>Renter</th>
              <th>Property / Unit</th>
              <th>Month</th>
              <th>Water ($)</th>
              <th>Electric ($)</th>
              <th>Gas ($)</th>
              <th>Security ($)</th>
              <th>Total ($)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={10} style={{textAlign:'center',color:'var(--muted)',padding:32}}>No bills found</td></tr>
            )}
            {filtered.map(b => (
              <tr key={b.id}>
                <td style={{fontWeight:650}}>{b.renter}</td>
                <td>
                  <div style={{fontSize:13}}>{b.property}</div>
                  <div style={{fontSize:11,color:'var(--muted)'}}>{b.floor} · <span className="af-prop-badge type">{b.unit}</span></div>
                </td>
                <td style={{fontSize:13}}>{b.month}</td>
                <td style={{fontVariantNumeric:'tabular-nums'}}>{b.water}</td>
                <td style={{fontVariantNumeric:'tabular-nums'}}>{b.electric}</td>
                <td style={{fontVariantNumeric:'tabular-nums'}}>{b.gas}</td>
                <td style={{fontVariantNumeric:'tabular-nums'}}>{b.security}</td>
                <td style={{fontWeight:700,fontVariantNumeric:'tabular-nums'}}>${total(b)}</td>
                <td>
                  <span
                    onClick={() => !b.paid && markPaid(b.id)}
                    style={{
                      fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:100,
                      background: b.paid ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                      color:      b.paid ? '#22c55e'              : '#ef4444',
                      cursor:     b.paid ? 'default'              : 'pointer',
                      userSelect: 'none',
                    }}
                    title={b.paid ? '' : 'Click to mark as paid'}
                  >
                    {b.paid ? 'paid' : 'unpaid'}
                  </span>
                </td>
                <td>
                  <div style={{display:'flex',gap:8}}>
                    <button className="af-prop-act edit" onClick={() => openEdit(b)}>Edit</button>
                    <button className="af-prop-act del"  onClick={() => del(b.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="af-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="af-modal" style={{maxWidth:560,maxHeight:'88vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">{editing ? 'Edit Utility Bill' : 'Add Utility Bill'}</h2>
            <div className="af-modal-form">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="af-field" style={{gridColumn:'1/-1'}}>
                  <label>Property</label>
                  <select className="af-select" value={form.property} onChange={e => sf(e.target.value,'property')}>
                    <option value="">Select property…</option>
                    <option>Sunrise Towers</option>
                    <option>Green Valley Block</option>
                    <option>Metro Heights</option>
                  </select>
                </div>
                <div className="af-field"><label>Floor</label><input value={form.floor} onChange={e=>sf(e.target.value,'floor')} placeholder="Floor 4"/></div>
                <div className="af-field"><label>Unit</label><input value={form.unit} onChange={e=>sf(e.target.value,'unit')} placeholder="4B"/></div>
                <div className="af-field"><label>Renter Name</label><input value={form.renter} onChange={e=>sf(e.target.value,'renter')} placeholder="James Carter"/></div>
                <div className="af-field"><label>Month</label><input value={form.month} onChange={e=>sf(e.target.value,'month')} placeholder="June 2026"/></div>
                <div className="af-field"><label>Water Bill ($)</label><input type="number" min="0" value={form.water} onChange={e=>sf(e.target.value,'water')} placeholder="0"/></div>
                <div className="af-field"><label>Electric Bill ($)</label><input type="number" min="0" value={form.electric} onChange={e=>sf(e.target.value,'electric')} placeholder="0"/></div>
                <div className="af-field"><label>Gas Bill ($)</label><input type="number" min="0" value={form.gas} onChange={e=>sf(e.target.value,'gas')} placeholder="0"/></div>
                <div className="af-field"><label>Security Bill ($)</label><input type="number" min="0" value={form.security} onChange={e=>sf(e.target.value,'security')} placeholder="0"/></div>
                <div className="af-field"><label>Other Bill ($)</label><input type="number" min="0" value={form.other} onChange={e=>sf(e.target.value,'other')} placeholder="0"/></div>
                <div className="af-field"><label>Issue Date</label><input type="date" value={form.date} onChange={e=>sf(e.target.value,'date')}/></div>
              </div>
              {/* Running total preview */}
              <div style={{marginTop:12,padding:'10px 14px',background:'var(--surface2)',borderRadius:10,fontSize:13,fontWeight:600}}>
                Total: <span style={{fontVariantNumeric:'tabular-nums',color:'var(--accent)'}}>
                  ${(Number(form.water)||0)+(Number(form.electric)||0)+(Number(form.gas)||0)+(Number(form.security)||0)+(Number(form.other)||0)}
                </span>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:22,justifyContent:'flex-end'}}>
              <button className="af-btn-secondary" style={{cursor:'pointer'}} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="af-auth-submit" style={{width:'auto',padding:'10px 24px'}} onClick={save}>
                {editing ? 'Save changes' : 'Add bill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
