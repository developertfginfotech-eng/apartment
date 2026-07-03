'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

interface Payroll {
  id: string
  employee: string
  startDate: string
  endDate: string
  payDate: string
  basic: number
  allowance: number
  ot: number
  absences: number
  gross: number
  sss: number
  phic: number
  hdmf: number
  paymentLoan: number
  net: number
  checkedBy: string
  approvedBy: string
  status: 'pending' | 'approved'
}

const MONTHS = [
  { value: '', label: '-- Select Month --' },
  { value:'1',label:'January'},{value:'2',label:'February'},{value:'3',label:'March'},
  {value:'4',label:'April'},{value:'5',label:'May'},{value:'6',label:'June'},
  {value:'7',label:'July'},{value:'8',label:'August'},{value:'9',label:'September'},
  {value:'10',label:'October'},{value:'11',label:'November'},{value:'12',label:'December'},
]

const CHECKER_OPTIONS  = ['','HR Manager','Finance Officer','Operations Head','Admin Staff']
const APPROVER_OPTIONS = ['','Super Admin','Director','CEO','Finance Director']

const SUB_NAV = ['Payroll','Manage Payroll','Payslip','Employee','Salary Structure']

function compute(basic:number,allowance:number,ot:number,absences:number,sss:number,phic:number,hdmf:number,paymentLoan:number){
  const gross = basic + allowance + ot - absences
  const net   = gross - sss - phic - hdmf - paymentLoan
  return { gross, net }
}
function build(raw: Omit<Payroll,'gross'|'net'>): Payroll {
  return { ...raw, ...compute(raw.basic,raw.allowance,raw.ot,raw.absences,raw.sss,raw.phic,raw.hdmf,raw.paymentLoan) }
}

const SEED: Payroll[] = [
  build({id:'pr1',employee:'Marve Sayson Opus',   startDate:'2025-07-25',endDate:'2025-07-31',payDate:'2025-08-02',basic:3577,allowance:300,ot:50,  absences:0,   sss:160,phic:71,hdmf:50,paymentLoan:500,  checkedBy:'HR Manager',   approvedBy:'Director',status:'approved'}),
  build({id:'pr2',employee:'Marve Sayson Opus',   startDate:'2025-07-11',endDate:'2025-07-17',payDate:'2025-07-19',basic:3577,allowance:300,ot:0,   absences:200, sss:160,phic:71,hdmf:50,paymentLoan:500,  checkedBy:'HR Manager',   approvedBy:'',status:'pending'}),
  build({id:'pr3',employee:'Resan Monterde Amemita',startDate:'2025-07-11',endDate:'2025-07-17',payDate:'2025-07-19',basic:3507,allowance:250,ot:0,   absences:500, sss:157,phic:70,hdmf:50,paymentLoan:500,  checkedBy:'Finance Officer',approvedBy:'',status:'pending'}),
  build({id:'pr4',employee:'Jovenal Paquit Estanioso',startDate:'2025-07-11',endDate:'2025-07-17',payDate:'2025-07-19',basic:3655,allowance:300,ot:100, absences:0,   sss:164,phic:73,hdmf:50,paymentLoan:0,   checkedBy:'HR Manager',   approvedBy:'Director',status:'approved'}),
]

const EMPTY_FORM = {
  employee:'',startDate:'',endDate:'',payDate:'',
  basic:'',allowance:'',ot:'',absences:'',
  sss:'',phic:'',hdmf:'',paymentLoan:'',
  checkedBy:'',approvedBy:'',
}

export default function PayrollPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [payrolls, setPayrolls]       = useState<Payroll[]>(SEED)
  const [activeTab, setActiveTab]     = useState('Payroll')
  const [showForm, setShowForm]       = useState(false)
  const [viewItem, setViewItem]       = useState<Payroll|null>(null)
  const [editItem, setEditItem]       = useState<Payroll|null>(null)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [filterMonth, setFilterMonth] = useState('')
  const [filterFrom, setFilterFrom]   = useState('')
  const [filterTo, setFilterTo]       = useState('')
  const [search, setSearch]           = useState('')
  const [showCount, setShowCount]     = useState(50)

  const n = (v:string) => parseFloat(v)||0
  const liveGross = n(form.basic)+n(form.allowance)+n(form.ot)-n(form.absences)
  const liveNet   = liveGross-n(form.sss)-n(form.phic)-n(form.hdmf)-n(form.paymentLoan)

  const filtered = useMemo(() => payrolls.filter(p => {
    if (filterMonth && String(new Date(p.startDate).getMonth()+1) !== filterMonth) return false
    if (filterFrom  && p.startDate < filterFrom) return false
    if (filterTo    && p.endDate   > filterTo)   return false
    if (search && !p.employee.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }).slice(0, showCount), [payrolls, filterMonth, filterFrom, filterTo, search, showCount])

  const totalNet      = filtered.reduce((s,p)=>s+p.net,0)
  const pendingCount  = filtered.filter(p=>p.status==='pending').length
  const approvedCount = filtered.filter(p=>p.status==='approved').length

  const resetForm = () => setForm(EMPTY_FORM)

  const openEdit = (p: Payroll) => {
    setEditItem(p)
    setForm({
      employee:p.employee, startDate:p.startDate, endDate:p.endDate, payDate:p.payDate,
      basic:String(p.basic), allowance:String(p.allowance), ot:String(p.ot), absences:String(p.absences),
      sss:String(p.sss), phic:String(p.phic), hdmf:String(p.hdmf), paymentLoan:String(p.paymentLoan),
      checkedBy:p.checkedBy, approvedBy:p.approvedBy,
    })
    setShowForm(true)
  }

  const save = () => {
    if (!form.employee||!form.startDate||!form.endDate||!form.payDate) return
    const entry = build({
      id: editItem ? editItem.id : `pr${Date.now()}`,
      employee:form.employee, startDate:form.startDate, endDate:form.endDate, payDate:form.payDate,
      basic:n(form.basic), allowance:n(form.allowance), ot:n(form.ot), absences:n(form.absences),
      sss:n(form.sss), phic:n(form.phic), hdmf:n(form.hdmf), paymentLoan:n(form.paymentLoan),
      checkedBy:form.checkedBy, approvedBy:form.approvedBy,
      status: editItem ? editItem.status : 'pending',
    })
    if (editItem) setPayrolls(ps=>ps.map(p=>p.id===editItem.id?entry:p))
    else          setPayrolls(ps=>[...ps,entry])
    setShowForm(false); setEditItem(null); resetForm()
  }

  const updateSignatory = (id:string, field:'checkedBy'|'approvedBy', val:string) => {
    setPayrolls(ps=>ps.map(p=>p.id===id?{...p,[field]:val}:p))
  }

  const exportCSV = () => {
    const headers = ['#','Employee','Start Date','End Date','Pay Date','Basic','Allowance','OT','Absences','Gross','SSS','PhilHealth','Pag-IBIG','Payment Loan','Net Pay','Checked By','Approved By','Status']
    const rows = filtered.map((p,i)=>[i+1,p.employee,p.startDate,p.endDate,p.payDate,p.basic,p.allowance,p.ot,p.absences,p.gross,p.sss,p.phic,p.hdmf,p.paymentLoan,p.net,p.checkedBy,p.approvedBy,p.status])
    const csv = [headers,...rows].map(r=>r.join(',')).join('\n')
    const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})),download:'payroll.csv'})
    a.click()
  }

  const fmt = (v:number) => v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})

  const selectStyle: React.CSSProperties = {
    background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:7,
    color:'var(--text)', fontSize:11.5, padding:'4px 6px', fontFamily:'inherit', cursor:'pointer', maxWidth:120,
  }

  return (
    <main className="af-db-main">
      <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>

        {/* Left sub-nav */}
        <div style={{ flexShrink:0, width:180, background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:14, overflow:'hidden' }}>
          {SUB_NAV.map(tab => (
            <button key={tab} onClick={()=>setActiveTab(tab)} style={{
              width:'100%', padding:'13px 18px', textAlign:'left', background: activeTab===tab?'var(--accent)':'none',
              border:'none', borderBottom:'1px solid var(--border2)', color: activeTab===tab?'#fff':'var(--text2)',
              fontWeight: activeTab===tab?700:500, fontSize:13.5, cursor:'pointer', fontFamily:'inherit',
              transition:'background 0.15s,color 0.15s',
            }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex:1, minWidth:0 }}>
          {/* Filters row */}
          <div style={{ display:'flex', gap:12, marginBottom:18, flexWrap:'wrap', alignItems:'flex-end' }}>
            <div className="af-field" style={{margin:0,minWidth:160}}>
              <label style={{fontSize:11.5}}>Select Month</label>
              <select className="af-select" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}>
                {MONTHS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="af-field" style={{margin:0,minWidth:140}}>
              <label style={{fontSize:11.5}}>From Date</label>
              <input type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)} style={{padding:'8px 10px'}}/>
            </div>
            <div className="af-field" style={{margin:0,minWidth:140}}>
              <label style={{fontSize:11.5}}>To Date</label>
              <input type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)} style={{padding:'8px 10px'}}/>
            </div>
            <div style={{marginLeft:'auto',display:'flex',gap:10}}>
              <button onClick={exportCSV} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',borderRadius:10,background:'rgba(34,197,94,0.12)',border:'1px solid rgba(34,197,94,0.3)',color:'#22c55e',fontWeight:650,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>
                ↓ Export
              </button>
              <button className="af-btn-primary" style={{cursor:'pointer',border:'none'}} onClick={()=>{resetForm();setEditItem(null);setShowForm(true)}}>
                + Add New
              </button>
            </div>
          </div>

          {/* Summary cards */}
          <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
            {[
              {label:'Total Net Payroll',value:`$${fmt(totalNet)}`,color:'var(--accent)'},
              {label:'Pending',          value:String(pendingCount), color:'#f97316'},
              {label:'Approved',         value:String(approvedCount),color:'#22c55e'},
            ].map(c=>(
              <div key={c.label} style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:12,padding:'16px 22px',minWidth:150}}>
                <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:6}}>{c.label}</div>
                <div style={{fontSize:24,fontWeight:800,color:c.color}}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Show entries + Search */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:10}}>
            <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'var(--muted)'}}>
              Show
              <select value={showCount} onChange={e=>setShowCount(Number(e.target.value))} style={{...selectStyle,maxWidth:70,padding:'5px 8px'}}>
                {[10,25,50,100].map(v=><option key={v} value={v}>{v}</option>)}
              </select>
              entries
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'var(--muted)'}}>
              Search:
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Employee name…"
                style={{background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:8,padding:'6px 12px',color:'var(--text)',fontSize:13,fontFamily:'inherit',width:180}}/>
            </div>
          </div>

          {/* Table */}
          <div className="af-prop-table-wrap" style={{overflowX:'auto'}}>
            <table className="af-prop-table" style={{minWidth:1050}}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Employee</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Payment Date</th>
                  <th>Basic Salary</th>
                  <th>Payment Loan</th>
                  <th>Net Pay</th>
                  <th>Checked By</th>
                  <th>Approved By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length===0 ? (
                  <tr><td colSpan={11} style={{textAlign:'center',padding:'40px',color:'var(--muted)'}}>No records found</td></tr>
                ) : filtered.map((p,i)=>(
                  <tr key={p.id}>
                    <td style={{color:'var(--muted)',fontSize:12}}>{i+1}</td>
                    <td style={{fontWeight:700,fontSize:13}}>{p.employee}</td>
                    <td style={{fontSize:12}}>{p.startDate}</td>
                    <td style={{fontSize:12}}>{p.endDate}</td>
                    <td style={{fontSize:12}}>{p.payDate}</td>
                    <td style={{fontVariantNumeric:'tabular-nums'}}>{fmt(p.basic)}</td>
                    <td style={{fontVariantNumeric:'tabular-nums',color:p.paymentLoan>0?'#ef4444':'var(--muted)'}}>{fmt(p.paymentLoan)}</td>
                    <td style={{fontWeight:700,fontVariantNumeric:'tabular-nums',color:'#22c55e'}}>{fmt(p.net)}</td>
                    <td>
                      <select value={p.checkedBy} onChange={e=>updateSignatory(p.id,'checkedBy',e.target.value)} style={selectStyle}>
                        {CHECKER_OPTIONS.map(o=><option key={o} value={o}>{o||'-- Select --'}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={p.approvedBy} onChange={e=>updateSignatory(p.id,'approvedBy',e.target.value)} style={selectStyle}>
                        {APPROVER_OPTIONS.map(o=><option key={o} value={o}>{o||'-- Select --'}</option>)}
                      </select>
                    </td>
                    <td>
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <button onClick={()=>openEdit(p)} title="Edit" style={{background:'none',border:'none',cursor:'pointer',color:'#60a5fa',fontSize:16,padding:2}}>✏️</button>
                        <button onClick={()=>setViewItem(p)} title="View" style={{background:'none',border:'none',cursor:'pointer',color:'var(--accent)',fontSize:16,padding:2}}>👁</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:10}}>
            Showing {filtered.length} of {payrolls.length} entries
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="af-modal-overlay" onClick={()=>{setShowForm(false);setEditItem(null);resetForm()}}>
          <div className="af-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:640,maxHeight:'90vh',overflowY:'auto'}}>
            <h2 className="af-modal-title">{editItem?'Edit Payroll':'Add Payroll'}</h2>
            <div className="af-modal-form">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="af-field" style={{gridColumn:'span 2'}}>
                  <label>Employee Name</label>
                  <input type="text" value={form.employee} onChange={e=>setForm(f=>({...f,employee:e.target.value}))} placeholder="Full name"/>
                </div>
                <div className="af-field"><label>Start Date</label><input type="date" value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))}/></div>
                <div className="af-field"><label>End Date</label><input type="date" value={form.endDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))}/></div>
                <div className="af-field" style={{gridColumn:'span 2'}}><label>Payment Date</label><input type="date" value={form.payDate} onChange={e=>setForm(f=>({...f,payDate:e.target.value}))}/></div>

                <div style={{gridColumn:'span 2',borderTop:'1px solid var(--border2)',paddingTop:10,fontSize:10,fontWeight:700,color:'var(--muted)',letterSpacing:'0.06em',textTransform:'uppercase'}}>Earnings</div>
                {(['basic','allowance','ot','absences'] as const).map(k=>(
                  <div key={k} className="af-field"><label style={{textTransform:'capitalize'}}>{k==='ot'?'Overtime':k==='absences'?'Absences (deduct)':k}</label>
                    <input type="number" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder="0"/></div>
                ))}

                <div style={{gridColumn:'span 2',borderTop:'1px solid var(--border2)',paddingTop:10,fontSize:10,fontWeight:700,color:'var(--muted)',letterSpacing:'0.06em',textTransform:'uppercase'}}>Deductions</div>
                {(['sss','phic','hdmf','paymentLoan'] as const).map(k=>(
                  <div key={k} className="af-field"><label>{k==='phic'?'PhilHealth':k==='hdmf'?'Pag-IBIG':k==='paymentLoan'?'Payment Loan':'SSS'}</label>
                    <input type="number" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder="0"/></div>
                ))}

                <div style={{gridColumn:'span 2',borderTop:'1px solid var(--border2)',paddingTop:10,fontSize:10,fontWeight:700,color:'var(--muted)',letterSpacing:'0.06em',textTransform:'uppercase'}}>Signatories</div>
                <div className="af-field"><label>Checked By</label>
                  <select className="af-select" value={form.checkedBy} onChange={e=>setForm(f=>({...f,checkedBy:e.target.value}))}>
                    {CHECKER_OPTIONS.map(o=><option key={o} value={o}>{o||'-- Select --'}</option>)}
                  </select>
                </div>
                <div className="af-field"><label>Approved By</label>
                  <select className="af-select" value={form.approvedBy} onChange={e=>setForm(f=>({...f,approvedBy:e.target.value}))}>
                    {APPROVER_OPTIONS.map(o=><option key={o} value={o}>{o||'-- Select --'}</option>)}
                  </select>
                </div>
              </div>

              <div style={{background:'var(--surface2)',borderRadius:10,padding:'14px 18px',marginTop:16,display:'flex',gap:28,flexWrap:'wrap'}}>
                <div>
                  <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>Gross Pay</div>
                  <div style={{fontSize:18,fontWeight:700,fontVariantNumeric:'tabular-nums'}}>${liveGross.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>Net Pay</div>
                  <div style={{fontSize:18,fontWeight:700,color:'#22c55e',fontVariantNumeric:'tabular-nums'}}>${liveNet.toLocaleString()}</div>
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:22,justifyContent:'flex-end'}}>
              <button className="af-btn-secondary" style={{cursor:'pointer'}} onClick={()=>{setShowForm(false);setEditItem(null);resetForm()}}>Cancel</button>
              <button className="af-auth-submit" style={{width:'auto',padding:'10px 28px'}} onClick={save}>{editItem?'Save Changes':'Add Payroll'}</button>
            </div>
          </div>
        </div>
      )}

      {/* View detail modal */}
      {viewItem && (
        <div className="af-modal-overlay" onClick={()=>setViewItem(null)}>
          <div className="af-modal" style={{maxWidth:500}} onClick={e=>e.stopPropagation()}>
            <h2 className="af-modal-title">Payroll Detail</h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
              {[
                ['Employee',  viewItem.employee],
                ['Start Date',viewItem.startDate],
                ['End Date',  viewItem.endDate],
                ['Pay Date',  viewItem.payDate],
                ['Basic',     `$${fmt(viewItem.basic)}`],
                ['Allowance', `$${fmt(viewItem.allowance)}`],
                ['Overtime',  `$${fmt(viewItem.ot)}`],
                ['Absences',  `-$${fmt(viewItem.absences)}`],
                ['Gross Pay', `$${fmt(viewItem.gross)}`],
                ['SSS',       `-$${fmt(viewItem.sss)}`],
                ['PhilHealth',`-$${fmt(viewItem.phic)}`],
                ['Pag-IBIG',  `-$${fmt(viewItem.hdmf)}`],
                ['Payment Loan',`-$${fmt(viewItem.paymentLoan)}`],
                ['Net Pay',   `$${fmt(viewItem.net)}`],
                ['Checked By', viewItem.checkedBy||'—'],
                ['Approved By',viewItem.approvedBy||'—'],
              ].map(([k,v])=>(
                <div key={k} style={{background:'var(--surface2)',borderRadius:9,padding:'10px 14px'}}>
                  <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>{k}</div>
                  <div style={{fontSize:14,fontWeight:600,color: k==='Net Pay'?'#22c55e':k.includes('Absences')||k.includes('Pag')||k.includes('SSS')||k.includes('PhilHealth')||k.includes('Loan')?'#ef4444':'var(--text)'}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',justifyContent:'flex-end'}}>
              <button className="af-btn-secondary" style={{cursor:'pointer'}} onClick={()=>setViewItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
