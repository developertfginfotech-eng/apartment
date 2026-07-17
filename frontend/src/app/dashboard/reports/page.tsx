'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from '@/lib/date'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

type ReportKey =
  | 'property' | 'outstanding' | 'ledger' | 'financial' | 'collection' | 'utility' | 'expenses'
  | 'wtax-expenses' | 'vat' | 'wtax-income' | 'parking' | 'refund-deposit'

interface ReportDef {
  key: ReportKey; icon: string; label: string; desc: string
  endpoint: string; dateFilter: boolean; search: boolean
  paginated?: boolean; totalColumn?: string
}

const ROWS: ReportDef[][] = [
  [
    { key:'property',    icon:'🏢', label:'Property Report',     desc:'Floors, units, and renters per property',      endpoint:'property',    dateFilter:false, search:false },
    { key:'outstanding', icon:'⚠️', label:'Property Outstanding', desc:'Amounts owed vs paid per lease',               endpoint:'outstanding', dateFilter:true,  search:true },
    { key:'ledger',      icon:'📒', label:'Ledger',               desc:'Net outstanding per lease with payments recorded', endpoint:'outstanding', dateFilter:true, search:true, paginated:true, totalColumn:'Outstanding' },
    { key:'financial',   icon:'📈', label:'Financial Report',    desc:'Revenue, costs, and profit per property',      endpoint:'financial',   dateFilter:true,  search:false },
    { key:'collection',  icon:'💳', label:'Collection Report',   desc:'Rent payments collected per lease',            endpoint:'collection',  dateFilter:true,  search:true },
    { key:'utility',     icon:'⚡', label:'Utility Report',      desc:'Utility bills summary per property',           endpoint:'utility',     dateFilter:true,  search:false },
    { key:'expenses',    icon:'💰', label:'Expenses Report',     desc:'All expenses by property and category',        endpoint:'expenses',    dateFilter:true,  search:true },
  ],
  [
    { key:'wtax-expenses', icon:'🧾', label:'Withholding Expenses Report', desc:'Expenses tagged as withholding',      endpoint:'wtax-expenses', dateFilter:true, search:true },
    { key:'vat',           icon:'🧮', label:'VAT Report',                  desc:'VAT amounts collected per lease',     endpoint:'vat',           dateFilter:true, search:true },
    { key:'wtax-income',   icon:'📉', label:'Withholding Income Report',   desc:'Withholding tax amounts per lease',   endpoint:'wtax-income',   dateFilter:true, search:true },
    { key:'parking',       icon:'🅿️', label:'Parking Income Report',       desc:'Parking payments per renter',         endpoint:'parking',       dateFilter:true, search:true },
    { key:'refund-deposit',icon:'🔁', label:'Refund Deposit Report',       desc:'Security deposit refunds per lease',  endpoint:'refund-deposit',dateFilter:true, search:true },
  ],
]
const ALL_REPORTS = ROWS.flat()
const PAGE_SIZE = 50

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('apt_token')}` })
const fmt = (v: number|string|null|undefined) => `₱ ${Number(v ?? 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`

export default function ReportsPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [active, setActive] = useState<ReportKey>('property')
  const report = ALL_REPORTS.find(r => r.key === active)!

  const [rows, setRows]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [from, setFrom]       = useState('')
  const [to, setTo]           = useState('')
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)

  const fetchReport = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams()
      if (report.dateFilter) { if (from) params.set('from', from); if (to) params.set('to', to) }
      if (report.search && search) params.set('search', search)
      const res  = await fetch(`${API}/report/${report.endpoint}?${params}`, { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message ?? `Request failed: ${res.status}`)
      setRows(Array.isArray(data) ? data : [])
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load report data'); setRows([]) }
    finally { setLoading(false) }
  }, [report, from, to, search])

  useEffect(() => { fetchReport() }, [fetchReport])

  const switchTab = (key: ReportKey) => { setActive(key); setFrom(''); setTo(''); setSearch(''); setPage(1) }

  // column definitions per report, kept declarative so export + render share one source of truth
  const columns: Record<ReportKey, { label:string; get:(r:any)=>string|number; raw?:(r:any)=>number }[]> = {
    property: [
      { label:'Name', get:r=>r.property_name },
      { label:'Total Floor', get:r=>r.total_floor },
      { label:'Total Unit', get:r=>r.total_unit },
      { label:'Total Renter', get:r=>r.total_renter },
      { label:'Status', get:r=>Number(r.total_renter)>0?'On Rent':'Available' },
    ],
    outstanding: [
      { label:'Lease No', get:r=>r.lease_no },
      { label:'Property', get:r=>r.property_name },
      { label:'Floor', get:r=>r.floor_name??'—' },
      { label:'Unit', get:r=>r.unit_name??'—' },
      { label:'Renter', get:r=>r.renter_name },
      { label:'Last Bill Date', get:r=>formatDate(r.lastbill_date) },
      { label:'Total Rent', get:r=>fmt(r.lease_total_rent) },
      { label:'Paid', get:r=>fmt(r.paid_amount) },
      { label:'Balance', get:r=>fmt(Number(r.lease_total_rent??0)-Number(r.paid_amount??0)) },
    ],
    ledger: [
      { label:'Property', get:r=>r.property_name },
      { label:'Floor', get:r=>r.floor_name??'—' },
      { label:'Unit', get:r=>r.unit_name??'—' },
      { label:'Renter', get:r=>r.renter_name },
      { label:'Last Pay', get:r=>formatDate(r.lastbill_date) },
      { label:'Outstanding', get:r=>fmt(Number(r.lease_total_rent??0)-Number(r.paid_amount??0)), raw:r=>Number(r.lease_total_rent??0)-Number(r.paid_amount??0) },
    ],
    financial: [
      { label:'Property', get:r=>r.property_name },
      { label:'Rent Collected', get:r=>fmt(r.pay_amount) },
      { label:'Owner Maintenance', get:r=>fmt(r.owner_maintenance) },
      { label:'Renter Maintenance', get:r=>fmt(r.renter_maintenance) },
      { label:'Expenses', get:r=>fmt(r.expenses) },
      { label:'Deposit', get:r=>fmt(r.deposit) },
      { label:'Net Profit', get:r=>fmt(Number(r.pay_amount??0)-Number(r.expenses??0)-Number(r.owner_maintenance??0)+Number(r.renter_maintenance??0)) },
    ],
    collection: [
      { label:'Lease No', get:r=>r.lease_no },
      { label:'Property', get:r=>r.property_name },
      { label:'Floor', get:r=>r.floor_name??'—' },
      { label:'Unit', get:r=>r.unit_name??'—' },
      { label:'Renter', get:r=>r.renter_name },
      { label:'Date', get:r=>formatDate(r.max_payment_date) },
      { label:'Amount', get:r=>fmt(r.total_paid_amount) },
    ],
    utility: [
      { label:'Property', get:r=>r.property_name },
      { label:'MCWD (Water)', get:r=>fmt(r.water_bill) },
      { label:'VECO (Gas)', get:r=>fmt(r.gas_bill) },
      { label:'Security', get:r=>fmt(r.security_bill) },
      { label:'Telephone', get:r=>fmt(r.utility_bill) },
      { label:'Other', get:r=>fmt(r.other_bill) },
      { label:'Total', get:r=>fmt(r.total_rent) },
    ],
    expenses: [
      { label:'Title', get:r=>r.title },
      { label:'Date', get:r=>formatDate(r.date) },
      { label:'Property', get:r=>r.property_name??'—' },
      { label:'Floor', get:r=>r.floor_name??'—' },
      { label:'Unit', get:r=>r.unit_name??'—' },
      { label:'Category', get:r=>r.category??'—' },
      { label:'Amount', get:r=>fmt(r.amount) },
    ],
    'wtax-expenses': [
      { label:'Title', get:r=>r.title },
      { label:'Date', get:r=>formatDate(r.date) },
      { label:'Property', get:r=>r.property_name??'—' },
      { label:'Floor', get:r=>r.floor_name??'—' },
      { label:'Unit', get:r=>r.unit_name??'—' },
      { label:'Category', get:r=>r.category??'—' },
      { label:'Amount', get:r=>fmt(r.amount) },
    ],
    vat: [
      { label:'Lease No', get:r=>r.lease_no },
      { label:'Property', get:r=>r.property_name },
      { label:'Floor', get:r=>r.floor_name??'—' },
      { label:'Unit', get:r=>r.unit_name??'—' },
      { label:'Renter', get:r=>r.renter_name },
      { label:'Date', get:r=>formatDate(r.max_payment_date) },
      { label:'VAT Amount', get:r=>fmt(r.total_paid_amount) },
    ],
    'wtax-income': [
      { label:'Lease No', get:r=>r.lease_no },
      { label:'Property', get:r=>r.property_name },
      { label:'Floor', get:r=>r.floor_name??'—' },
      { label:'Unit', get:r=>r.unit_name??'—' },
      { label:'Renter', get:r=>r.renter_name },
      { label:'Date', get:r=>formatDate(r.max_payment_date) },
      { label:'WHT Amount', get:r=>fmt(r.total_paid_amount) },
    ],
    parking: [
      { label:'Property', get:r=>r.property_name??'—' },
      { label:'Renter', get:r=>r.renter_name??'—' },
      { label:'Payment Date', get:r=>Number(r.payment_status)!==0?formatDate(r.payment_date):'—' },
      { label:'Amount', get:r=>fmt(Number(r.payment_status)!==0?r.price:0) },
    ],
    'refund-deposit': [
      { label:'Property', get:r=>r.property_name??'—' },
      { label:'Renter', get:r=>r.renter_name??'—' },
      { label:'Payment Date', get:r=>Number(r.payment_status)!==0?formatDate(r.payment_date):'—' },
      { label:'Amount', get:r=>fmt(Number(r.payment_status)!==0?r.amount:0) },
    ],
  }

  const cols = columns[active]
  const numericCols = new Set(['Total Rent','Paid','Balance','Outstanding','Rent Collected','Owner Maintenance','Renter Maintenance','Expenses','Deposit','Net Profit','Amount','VAT Amount','WHT Amount','MCWD (Water)','VECO (Gas)','Security','Telephone','Other','Total'])

  // Ledger mirrors Laravel's ledger.blade.php: only leases with at least one recorded
  // payment, paginated 50/page, with a Total Amount footer summed across all matching rows
  const visibleRows = active === 'ledger' ? rows.filter(r => Number(r.paid_amount) > 0) : rows
  const totalPages = report.paginated ? Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE)) : 1
  const pagedRows = report.paginated ? visibleRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : visibleRows
  const totalCol = cols.find(c => c.label === report.totalColumn)
  const grandTotal = totalCol?.raw ? visibleRows.reduce((s, r) => s + totalCol.raw!(r), 0) : null

  const exportCSV = () => {
    const csv = [cols.map(c=>c.label), ...visibleRows.map(r=>cols.map(c=>c.get(r)))].map(r=>r.join(',')).join('\n')
    const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})),download:`${report.endpoint}.csv`})
    a.click()
  }

  const exportPDF = () => {
    const doc = new jsPDF({ orientation:'landscape' })
    doc.setFontSize(14)
    doc.text(report.label, 14, 14)
    autoTable(doc, {
      head: [cols.map(c=>c.label)],
      body: visibleRows.map(r=>cols.map(c=>String(c.get(r)))),
      startY: 20,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [249,115,22] },
    })
    doc.save(`${report.endpoint}.pdf`)
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{marginBottom:20}}>
        <div>
          <h1 className="af-db-greeting" style={{fontSize:26}}>Reports</h1>
          <p className="af-db-subtitle">Financial and operational reports</p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={exportCSV} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',borderRadius:10,background:'rgba(34,197,94,0.12)',border:'1px solid rgba(34,197,94,0.3)',color:'#22c55e',fontWeight:650,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>↓ Export CSV</button>
          <button onClick={exportPDF} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',borderRadius:10,background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.3)',color:'#ef4444',fontWeight:650,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>↓ Export PDF</button>
        </div>
      </div>

      {/* Report type tabs — two rows, matching the reference nav grouping */}
      <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:22}}>
        {ROWS.map((row,i) => (
          <div key={i} style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {row.map(r => (
              <button key={r.key} onClick={()=>switchTab(r.key)} style={{display:'flex',alignItems:'center',gap:7,padding:'8px 14px',borderRadius:9,border:'1px solid',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',borderColor:active===r.key?'var(--accent)':'var(--border2)',background:active===r.key?'rgba(249,115,22,0.12)':'var(--surface)',color:active===r.key?'var(--accent)':'var(--muted)'}}>
                <span>{r.icon}</span>{r.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Report header */}
      <div style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:10,padding:'14px 18px',marginBottom:18}}>
        <div style={{fontWeight:720,fontSize:14}}>{report.icon} {report.label}</div>
        <div style={{fontSize:12.5,color:'var(--muted)',marginTop:2}}>{report.desc}</div>
      </div>

      {(report.dateFilter || report.search) && (
        <div style={{display:'flex',gap:12,marginBottom:18,flexWrap:'wrap',alignItems:'flex-end'}}>
          {report.dateFilter && <>
            <div className="af-field" style={{margin:0,minWidth:140}}><label style={{fontSize:11.5}}>From Date</label>
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{padding:'8px 10px'}}/></div>
            <div className="af-field" style={{margin:0,minWidth:140}}><label style={{fontSize:11.5}}>To Date</label>
              <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{padding:'8px 10px'}}/></div>
          </>}
          {report.search && (
            <div className="af-field" style={{margin:0,minWidth:200}}><label style={{fontSize:11.5}}>Search</label>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{padding:'8px 10px'}}/></div>
          )}
          {(from||to||search) && (
            <button onClick={()=>{setFrom('');setTo('');setSearch('')}} style={{padding:'8px 14px',borderRadius:8,background:'none',border:'1px solid var(--border2)',color:'var(--muted)',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Clear</button>
          )}
        </div>
      )}

      {error && <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,padding:'10px 16px',marginBottom:16,color:'#ef4444',fontSize:13}}>{error}</div>}

      {loading ? (
        <div style={{textAlign:'center',padding:'60px 0',color:'var(--muted)'}}>Loading…</div>
      ) : (
        <div className="af-prop-table-wrap">
          <table className="af-prop-table">
            <thead>
              <tr>
                <th>#</th>
                {cols.map(c=><th key={c.label}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {pagedRows.length===0 ? (
                <tr><td colSpan={cols.length + 1} style={{textAlign:'center',color:'var(--muted)',padding:32}}>No data available</td></tr>
              ) : pagedRows.map((r,i) => (
                <tr key={i}>
                  <td style={{color:'var(--muted)',fontSize:12}}>{(page-1)*PAGE_SIZE+i+1}</td>
                  {cols.map(c => (
                    <td key={c.label} style={{fontVariantNumeric:numericCols.has(c.label)?'tabular-nums':undefined,fontWeight:numericCols.has(c.label)?700:undefined}}>
                      {active==='property' && c.label==='Status' ? (
                        <span style={{fontSize:11,fontWeight:650,padding:'3px 10px',borderRadius:100,background:c.get(r)==='Available'?'rgba(34,197,94,0.12)':'rgba(249,115,22,0.12)',color:c.get(r)==='Available'?'#22c55e':'var(--accent)'}}>
                          {c.get(r)}
                        </span>
                      ) : c.get(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {grandTotal !== null && pagedRows.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={cols.length} style={{textAlign:'right',fontWeight:700}}>Total Amount:</td>
                  <td style={{fontWeight:800,fontVariantNumeric:'tabular-nums',color:'var(--accent)'}}>{fmt(grandTotal)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {report.paginated && totalPages > 1 && (
        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:16,flexWrap:'wrap'}}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
            style={{padding:'6px 12px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--surface2)',color:'var(--text)',cursor:page===1?'not-allowed':'pointer',opacity:page===1?0.4:1,fontFamily:'inherit',fontSize:13}}>‹</button>
          {Array.from({length:totalPages},(_,i)=>i+1).map(n=>(
            <button key={n} onClick={()=>setPage(n)}
              style={{padding:'6px 12px',borderRadius:8,border:'1px solid var(--border2)',background:page===n?'var(--accent)':'var(--surface2)',color:page===n?'#fff':'var(--text)',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:page===n?700:500}}>{n}</button>
          ))}
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
            style={{padding:'6px 12px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--surface2)',color:'var(--text)',cursor:page===totalPages?'not-allowed':'pointer',opacity:page===totalPages?0.4:1,fontFamily:'inherit',fontSize:13}}>›</button>
          <span style={{fontSize:12,color:'var(--muted)',marginLeft:8}}>Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,visibleRows.length)} of {visibleRows.length} entries</span>
        </div>
      )}
    </main>
  )
}
