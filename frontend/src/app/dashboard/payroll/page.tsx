'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import SalaryStructureTab from './SalaryStructureTab'
import EmployeeTab from './EmployeeTab'
import ManagePayrollTab from './ManagePayrollTab'
import PayslipTab from './PayslipTab'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Payroll {
  id: number
  employee_name: string
  start_date: string
  end_date: string
  payment_date: string
  basic: number
  ot_pay: number
  rental: number
  absences: number
  late: number
  gross_pay: number
  g_pay: number
  g_pay_net: number
  sss: number
  phic: number
  hdmf: number
  gross_pay_net: number
  sss_loan: number
  hdmf_loan: number
  cash_advance: number
  allowance: number
  adjustment: number
  net_pay: number
  checked_by_name: string
  approved_by_name: string
  checked_by: number | null
  approved_by: number | null
  status: number
}

const MONTHS = [
  { value:'',  label:'-- Select Month --' },
  { value:'1', label:'January'  }, { value:'2',  label:'February' },
  { value:'3', label:'March'    }, { value:'4',  label:'April'    },
  { value:'5', label:'May'      }, { value:'6',  label:'June'     },
  { value:'7', label:'July'     }, { value:'8',  label:'August'   },
  { value:'9', label:'September'}, { value:'10', label:'October'  },
  { value:'11',label:'November' }, { value:'12', label:'December' },
]

const SUB_NAV = ['Payroll','Manage Payroll','Payslip','Employee','Salary Structure']

const EMPTY_FORM = {
  employee_id:'', start_date:'', end_date:'', payment_date:'',
  basic:'0', ot_pay:'0', rental:'0', absences:'0', late:'0',
  sss:'0', phic:'0', hdmf:'0',
  sss_loan:'0', hdmf_loan:'0', cash_advance:'0',
  allowance:'0', adjustment:'0',
}

export default function PayrollPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [payrolls, setPayrolls]   = useState<Payroll[]>([])
  const [total, setTotal]         = useState(0)
  const [pages, setPages]         = useState(1)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [employees, setEmployees]     = useState<{id:number; name:string}[]>([])
  const [signatories, setSignatories] = useState<{id:number; name:string}[]>([])

  const [activeTab, setActiveTab] = useState('Payroll')
  const [showForm, setShowForm]   = useState(false)
  const [viewItem, setViewItem]   = useState<Payroll|null>(null)
  const [editItem, setEditItem]   = useState<Payroll|null>(null)
  const [form, setForm]           = useState(EMPTY_FORM)

  const [page, setPage]           = useState(1)
  const [limit, setLimit]         = useState(50)
  const [filterMonth, setFilterMonth] = useState('')
  const [filterFrom, setFilterFrom]   = useState('')
  const [filterTo, setFilterTo]       = useState('')
  const [search, setSearch]           = useState('')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const fetchPayrolls = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (filterMonth) params.set('month', filterMonth)
      if (filterFrom)  params.set('from',  filterFrom)
      if (filterTo)    params.set('to',    filterTo)
      if (search)      params.set('search', search)
      const res  = await fetch(`${API}/payroll?${params}`, { headers: authHeaders() })
      const data = await res.json()
      setPayrolls(data.data ?? [])
      setTotal(data.total ?? 0)
      setPages(data.pages ?? 1)
    } catch { setError('Failed to load payroll data') }
    finally { setLoading(false) }
  }, [page, limit, filterMonth, filterFrom, filterTo, search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchPayrolls() }, [fetchPayrolls])

  useEffect(() => {
    const h = authHeaders()
    fetch(`${API}/payroll/employees`, { headers: h })
      .then(r => r.json()).then(d => Array.isArray(d) && setEmployees(d)).catch(()=>{})
    fetch(`${API}/payroll/signatories`, { headers: h })
      .then(r => r.json()).then(d => Array.isArray(d) && setSignatories(d)).catch(()=>{})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const n = (v:string) => parseFloat(v)||0
  // Match Laravel formula exactly:
  // G-Pay = basic + ot_pay - rental - absences - late
  // G-Pay Net = G-Pay - SSS - PHIC - HDMF
  // Net Pay = G-Pay Net - SSS Loan - HDMF Loan - Cash Advance + Allowance + Adjustment
  const liveGPay    = n(form.basic) + n(form.ot_pay) - n(form.rental) - n(form.absences) - n(form.late)
  const liveGPayNet = liveGPay - n(form.sss) - n(form.phic) - n(form.hdmf)
  const liveNet     = liveGPayNet - n(form.sss_loan) - n(form.hdmf_loan) - n(form.cash_advance) + n(form.allowance) + n(form.adjustment)

  const resetForm = () => setForm(EMPTY_FORM)

  const openEdit = (p: Payroll) => {
    setEditItem(p)
    setForm({
      employee_id: '', start_date: p.start_date, end_date: p.end_date,
      payment_date: p.payment_date ?? '',
      basic: String(p.basic), ot_pay: String(p.ot_pay), rental: String(p.rental ?? 0),
      absences: String(p.absences), late: String(p.late ?? 0),
      sss: String(p.sss), phic: String(p.phic), hdmf: String(p.hdmf),
      sss_loan: String(p.sss_loan), hdmf_loan: String(p.hdmf_loan),
      cash_advance: String(p.cash_advance), allowance: String(p.allowance), adjustment: String(p.adjustment ?? 0),
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.start_date || !form.end_date) return
    const body = {
      employee_id: form.employee_id ? parseInt(form.employee_id) : null,
      start_date: form.start_date, end_date: form.end_date, payment_date: form.payment_date,
      basic: n(form.basic), ot_pay: n(form.ot_pay), rental: n(form.rental),
      absences: n(form.absences), late: n(form.late),
      g_pay: liveGPay,
      sss: n(form.sss), phic: n(form.phic), hdmf: n(form.hdmf),
      g_pay_net: liveGPayNet,
      gross_pay: liveGPay, gross_pay_net: liveGPayNet,
      sss_loan: n(form.sss_loan), hdmf_loan: n(form.hdmf_loan),
      cash_advance: n(form.cash_advance),
      allowance: n(form.allowance), adjustment: n(form.adjustment),
      net_pay: liveNet,
    }
    try {
      if (editItem) {
        await fetch(`${API}/payroll/${editItem.id}`, { method:'PUT', headers:authHeaders(), body:JSON.stringify(body) })
      } else {
        await fetch(`${API}/payroll`, { method:'POST', headers:authHeaders(), body:JSON.stringify(body) })
      }
      setShowForm(false); setEditItem(null); resetForm(); fetchPayrolls()
    } catch { setError('Failed to save') }
  }

  const exportHeaders = ['#','Employee','Start Date','End Date','Pay Date','Basic','OT Pay','Allowance','Absences','Gross','SSS','PhilHealth','Pag-IBIG','SSS Loan','HDMF Loan','Cash Advance','Net Pay','Checked By','Approved By']
  const exportRows = () => payrolls.map((p,i) => [i+1,p.employee_name,p.start_date,p.end_date,p.payment_date,p.basic,p.ot_pay,p.allowance,p.absences,p.gross_pay,p.sss,p.phic,p.hdmf,p.sss_loan,p.hdmf_loan,p.cash_advance,p.net_pay,p.checked_by_name??'',p.approved_by_name??''])

  const exportCSV = () => {
    const csv = [exportHeaders,...exportRows()].map(r=>r.join(',')).join('\n')
    const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})),download:'payroll.csv'})
    a.click()
  }

  const exportPDF = () => {
    const doc = new jsPDF({ orientation:'landscape' })
    doc.setFontSize(14)
    doc.text('Payroll', 14, 14)
    autoTable(doc, {
      head: [exportHeaders],
      body: exportRows().map(r => r.map(String)),
      startY: 20,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [34,197,94] },
    })
    doc.save('payroll.pdf')
  }

  const fmt = (v: number|string) => `₱ ${Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`

  const totalNet = payrolls.reduce((s,p) => s+Number(p.net_pay),0)

  const selectStyle: React.CSSProperties = {
    background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:7,
    color:'var(--text)', fontSize:11.5, padding:'4px 6px', fontFamily:'inherit', cursor:'pointer', maxWidth:120,
  }

  const getPageNums = () => {
    if (pages <= 7) return Array.from({length: pages}, (_,i) => i+1)
    const nums: (number|'...')[] = []
    const delta = 2
    const left = Math.max(2, page - delta)
    const right = Math.min(pages - 1, page + delta)
    nums.push(1)
    if (left > 2) nums.push('...')
    for (let i = left; i <= right; i++) nums.push(i)
    if (right < pages - 1) nums.push('...')
    nums.push(pages)
    return nums
  }
  const pageNums = getPageNums()

  return (
    <main className="af-db-main">
      {/* Header */}
      <div className="af-db-topbar" style={{marginBottom:20}}>
        <div>
          <h1 className="af-db-greeting" style={{fontSize:26}}>Payroll</h1>
          <p className="af-db-subtitle">Employee salary and payroll management</p>
        </div>
        {activeTab==='Payroll' && (
          <div style={{display:'flex',gap:10}}>
            <button onClick={exportCSV} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',borderRadius:10,background:'rgba(34,197,94,0.12)',border:'1px solid rgba(34,197,94,0.3)',color:'#22c55e',fontWeight:650,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>
              ↓ Export CSV
            </button>
            <button onClick={exportPDF} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',borderRadius:10,background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.3)',color:'#ef4444',fontWeight:650,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>
              ↓ Export PDF
            </button>
            <button className="af-btn-primary" style={{cursor:'pointer',border:'none'}} onClick={()=>{resetForm();setEditItem(null);setShowForm(true)}}>
              + Add New
            </button>
          </div>
        )}
      </div>

      {/* Tab pills */}
      <div style={{display:'flex',gap:4,marginBottom:24,background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:12,padding:5,width:'fit-content'}}>
        {SUB_NAV.map(tab => (
          <button key={tab} onClick={()=>setActiveTab(tab)} style={{
            padding:'8px 18px',borderRadius:9,border:'none',cursor:'pointer',fontFamily:'inherit',
            fontSize:13,fontWeight:activeTab===tab?700:500,
            background:activeTab===tab?'var(--accent)':'transparent',
            color:activeTab===tab?'#fff':'var(--text2)',
            transition:'background 0.15s,color 0.15s',
          }}>{tab}</button>
        ))}
      </div>

      {activeTab==='Manage Payroll' && <ManagePayrollTab/>}
      {activeTab==='Payslip' && <PayslipTab/>}
      {activeTab==='Employee' && <EmployeeTab/>}
      {activeTab==='Salary Structure' && <SalaryStructureTab/>}

      {activeTab==='Payroll' && <>
      {/* Filters */}
      <div style={{display:'flex',gap:12,marginBottom:18,flexWrap:'wrap',alignItems:'flex-end'}}>
        <div className="af-field" style={{margin:0,minWidth:160}}>
          <label style={{fontSize:11.5}}>Select Month</label>
          <select className="af-select" value={filterMonth} onChange={e=>{setFilterMonth(e.target.value);setPage(1)}}>
            {MONTHS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="af-field" style={{margin:0,minWidth:140}}>
          <label style={{fontSize:11.5}}>From Date</label>
          <input type="date" value={filterFrom} onChange={e=>{setFilterFrom(e.target.value);setPage(1)}} style={{padding:'8px 10px'}}/>
        </div>
        <div className="af-field" style={{margin:0,minWidth:140}}>
          <label style={{fontSize:11.5}}>To Date</label>
          <input type="date" value={filterTo} onChange={e=>{setFilterTo(e.target.value);setPage(1)}} style={{padding:'8px 10px'}}/>
        </div>
        {(filterMonth||filterFrom||filterTo) && (
          <button onClick={()=>{setFilterMonth('');setFilterFrom('');setFilterTo('');setPage(1)}} style={{alignSelf:'flex-end',padding:'8px 14px',borderRadius:8,background:'none',border:'1px solid var(--border2)',color:'var(--muted)',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Clear</button>
        )}
      </div>

      {/* Summary */}
      <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        {[
          {label:'Total Net Payroll',value:fmt(totalNet),color:'var(--accent)'},
          {label:'Total Records',    value:String(total),       color:'#3b82f6'},
          {label:'Showing',          value:`${payrolls.length} entries`,color:'var(--muted)'},
        ].map(c=>(
          <div key={c.label} style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:12,padding:'16px 22px',minWidth:160}}>
            <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:6}}>{c.label}</div>
            <div style={{fontSize:22,fontWeight:800,color:c.color}}>{c.value}</div>
          </div>
        ))}
      </div>

      {error && <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,padding:'10px 16px',marginBottom:16,color:'#ef4444',fontSize:13}}>{error}</div>}

      {/* Show + Search */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:10}}>
        <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'var(--muted)'}}>
          Show
          <select value={limit} onChange={e=>{setLimit(Number(e.target.value));setPage(1)}} style={{...selectStyle,maxWidth:70,padding:'5px 8px'}}>
            {[10,25,50,100].map(v=><option key={v} value={v}>{v}</option>)}
          </select>
          entries
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'var(--muted)'}}>
          Search:
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Employee name…"
            style={{background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:8,padding:'6px 12px',color:'var(--text)',fontSize:13,fontFamily:'inherit',width:180}}/>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{textAlign:'center',padding:'60px 0',color:'var(--muted)'}}>Loading payroll data…</div>
      ) : (
        <div className="af-prop-table-wrap" style={{overflowX:'auto'}}>
          <table className="af-prop-table" style={{minWidth:1050}}>
            <thead>
              <tr>
                <th>#</th><th>Employee</th><th>Start Date</th><th>End Date</th>
                <th>Payment Date</th><th>Basic Salary</th><th>Payment Loan</th>
                <th>Net Pay</th><th>Checked By</th><th>Approved By</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {payrolls.length===0 ? (
                <tr><td colSpan={11} style={{textAlign:'center',padding:'40px',color:'var(--muted)'}}>No records found</td></tr>
              ) : payrolls.map((p,i)=>(
                <tr key={p.id}>
                  <td style={{color:'var(--muted)',fontSize:12}}>{(page-1)*limit+i+1}</td>
                  <td style={{fontWeight:700,fontSize:13}}>{p.employee_name||'—'}</td>
                  <td style={{fontSize:12}}>{p.start_date}</td>
                  <td style={{fontSize:12}}>{p.end_date}</td>
                  <td style={{fontSize:12}}>{p.payment_date||'—'}</td>
                  <td style={{fontVariantNumeric:'tabular-nums'}}>{fmt(p.basic)}</td>
                  <td style={{fontVariantNumeric:'tabular-nums',color:Number(p.sss_loan)+Number(p.hdmf_loan)+Number(p.cash_advance)>0?'#ef4444':'var(--muted)'}}>
                    {fmt(Number(p.sss_loan)+Number(p.hdmf_loan)+Number(p.cash_advance))}
                  </td>
                  <td style={{fontWeight:700,fontVariantNumeric:'tabular-nums',color:'#22c55e'}}>{fmt(p.net_pay)}</td>
                  <td>
                    <select
                      value={p.checked_by??''}
                      onChange={e => {
                        const v = e.target.value
                        fetch(`${API}/payroll/${p.id}`, { method:'PUT', headers: authHeaders(), body: JSON.stringify({ checked_by: v||null }) }).then(() => fetchPayrolls())
                      }}
                      style={selectStyle}
                    >
                      <option value="">-- Select --</option>
                      {signatories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select
                      value={p.approved_by??''}
                      onChange={e => {
                        const v = e.target.value
                        fetch(`${API}/payroll/${p.id}`, { method:'PUT', headers: authHeaders(), body: JSON.stringify({ approved_by: v||null }) }).then(() => fetchPayrolls())
                      }}
                      style={selectStyle}
                    >
                      <option value="">-- Select --</option>
                      {signatories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>openEdit(p)} title="Edit" style={{background:'none',border:'none',cursor:'pointer',color:'#60a5fa',fontSize:16,padding:2}}>✏️</button>
                      <button onClick={()=>setViewItem(p)} title="View" style={{background:'none',border:'none',cursor:'pointer',color:'var(--accent)',fontSize:16,padding:2}}>👁</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:16,flexWrap:'wrap'}}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
            style={{padding:'6px 12px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--surface2)',color:'var(--text)',cursor:page===1?'not-allowed':'pointer',opacity:page===1?0.4:1,fontFamily:'inherit',fontSize:13}}>‹</button>
          {pageNums.map((n,i)=>
            n === '...'
              ? <span key={`e${i}`} style={{color:'var(--muted)',fontSize:13,padding:'0 4px'}}>…</span>
              : <button key={n} onClick={()=>setPage(n as number)}
                  style={{padding:'6px 12px',borderRadius:8,border:'1px solid var(--border2)',background:page===n?'var(--accent)':'var(--surface2)',color:page===n?'#fff':'var(--text)',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:page===n?700:500}}>
                  {n}
                </button>
          )}
          <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages}
            style={{padding:'6px 12px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--surface2)',color:'var(--text)',cursor:page===pages?'not-allowed':'pointer',opacity:page===pages?0.4:1,fontFamily:'inherit',fontSize:13}}>›</button>
          <span style={{fontSize:12,color:'var(--muted)',marginLeft:8}}>Showing {(page-1)*limit+1}–{Math.min(page*limit,total)} of {total} entries</span>
        </div>
      )}

      {!loading && pages <= 1 && (
        <div style={{fontSize:12,color:'var(--muted)',marginTop:10}}>Showing {payrolls.length} of {total} entries</div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="af-modal-overlay" onClick={()=>{setShowForm(false);setEditItem(null);resetForm()}}>
          <div className="af-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:640,maxHeight:'90vh',overflowY:'auto'}}>
            <h2 className="af-modal-title">{editItem?'Edit Payroll':'Add Payroll'}</h2>
            <div className="af-modal-form">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                {employees.length>0 && (
                  <div className="af-field" style={{gridColumn:'span 2'}}>
                    <label>Employee</label>
                    <select className="af-select" value={form.employee_id} onChange={e=>setForm(f=>({...f,employee_id:e.target.value}))}>
                      <option value="">-- Select Employee --</option>
                      {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="af-field"><label>Start Date</label><input type="date" value={form.start_date} onChange={e=>setForm(f=>({...f,start_date:e.target.value}))}/></div>
                <div className="af-field"><label>End Date</label><input type="date" value={form.end_date} onChange={e=>setForm(f=>({...f,end_date:e.target.value}))}/></div>
                <div className="af-field" style={{gridColumn:'span 2'}}><label>Payment Date</label><input type="date" value={form.payment_date} onChange={e=>setForm(f=>({...f,payment_date:e.target.value}))}/></div>

                <div style={{gridColumn:'span 2',borderTop:'1px solid var(--border2)',paddingTop:10,fontSize:10,fontWeight:700,color:'var(--muted)',letterSpacing:'0.06em',textTransform:'uppercase'}}>Earnings</div>
                {([['basic','Basic Pay'],['ot_pay','OT Pay'],['rental','Rental'],['absences','Absences'],['late','Late']] as const).map(([k,l])=>(
                  <div key={k} className="af-field"><label>{l}</label>
                    <input type="number" step="0.01" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder="0.00"/></div>
                ))}

                {/* G-Pay auto-calculated */}
                <div className="af-field" style={{gridColumn:'span 2'}}>
                  <label style={{color:'var(--accent)'}}>G-Pay (Auto Calculated)</label>
                  <input type="number" readOnly value={liveGPay.toFixed(2)} style={{opacity:0.7,cursor:'not-allowed'}}/>
                </div>

                <div style={{gridColumn:'span 2',borderTop:'1px solid var(--border2)',paddingTop:10,fontSize:10,fontWeight:700,color:'var(--muted)',letterSpacing:'0.06em',textTransform:'uppercase'}}>Contributions</div>
                {([['sss','SSS'],['phic','PhilHealth (PHIC)'],['hdmf','Pag-IBIG (HDMF)']] as const).map(([k,l])=>(
                  <div key={k} className="af-field"><label>{l}</label>
                    <input type="number" step="0.01" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder="0.00"/></div>
                ))}

                {/* G-Pay Net auto-calculated */}
                <div className="af-field" style={{gridColumn:'span 2'}}>
                  <label style={{color:'var(--accent)'}}>G-Pay Net (Auto Calculated)</label>
                  <input type="number" readOnly value={liveGPayNet.toFixed(2)} style={{opacity:0.7,cursor:'not-allowed'}}/>
                </div>

                <div style={{gridColumn:'span 2',borderTop:'1px solid var(--border2)',paddingTop:10,fontSize:10,fontWeight:700,color:'var(--muted)',letterSpacing:'0.06em',textTransform:'uppercase'}}>Deductions & Additions</div>
                {([['sss_loan','SSS Loan'],['hdmf_loan','HDMF Loan'],['cash_advance','Payment Loan'],['allowance','Allowance'],['adjustment','Adjustment']] as const).map(([k,l])=>(
                  <div key={k} className="af-field"><label>{l}</label>
                    <input type="number" step="0.01" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder="0.00"/></div>
                ))}
              </div>
              <div style={{background:'var(--surface2)',borderRadius:10,padding:'14px 18px',marginTop:16,display:'flex',gap:28,flexWrap:'wrap'}}>
                <div>
                  <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>G-Pay</div>
                  <div style={{fontSize:16,fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{fmt(liveGPay)}</div>
                </div>
                <div>
                  <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>G-Pay Net</div>
                  <div style={{fontSize:16,fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{fmt(liveGPayNet)}</div>
                </div>
                <div>
                  <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>Net Pay (Auto Calculated)</div>
                  <div style={{fontSize:20,fontWeight:700,color:'#22c55e',fontVariantNumeric:'tabular-nums'}}>{fmt(liveNet)}</div>
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

      {/* View modal */}
      {viewItem && (
        <div className="af-modal-overlay" onClick={()=>setViewItem(null)}>
          <div className="af-modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
            <h2 className="af-modal-title">Payroll Detail</h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
              {([
                ['Employee',   viewItem.employee_name||'—'],
                ['Start Date', viewItem.start_date],
                ['End Date',   viewItem.end_date],
                ['Pay Date',   viewItem.payment_date||'—'],
                ['Basic',      fmt(viewItem.basic)],
                ['Allowance',  fmt(viewItem.allowance)],
                ['OT Pay',     fmt(viewItem.ot_pay)],
                ['Absences',   fmt(viewItem.absences)],
                ['Gross Pay',  fmt(viewItem.gross_pay)],
                ['SSS',        fmt(viewItem.sss)],
                ['PhilHealth', fmt(viewItem.phic)],
                ['Pag-IBIG',   fmt(viewItem.hdmf)],
                ['SSS Loan',   fmt(viewItem.sss_loan)],
                ['HDMF Loan',  fmt(viewItem.hdmf_loan)],
                ['Cash Advance',fmt(viewItem.cash_advance)],
                ['Net Pay',    fmt(viewItem.net_pay)],
                ['Checked By', viewItem.checked_by_name||'—'],
                ['Approved By',viewItem.approved_by_name||'—'],
              ] as [string,string][]).map(([k,v])=>(
                <div key={k} style={{background:'var(--surface2)',borderRadius:9,padding:'10px 14px'}}>
                  <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>{k}</div>
                  <div style={{fontSize:14,fontWeight:600,color:k==='Net Pay'?'#22c55e':'var(--text)'}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',justifyContent:'flex-end'}}>
              <button className="af-btn-secondary" style={{cursor:'pointer'}} onClick={()=>setViewItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      </>}
    </main>
  )
}
