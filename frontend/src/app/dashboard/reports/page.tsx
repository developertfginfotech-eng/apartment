'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type ReportType = 'collection'|'financial'|'outstanding'|'utility'|'expense'|'wtax'

const PAYMENT_DATA = [
  { lease:'LS0001', renter:'James Carter',  property:'Sunrise Towers',    unit:'4B', collected:13200, months:6 },
  { lease:'LS0002', renter:'Priya Sharma',  property:'Green Valley Block', unit:'2A', collected:9250,  months:5 },
  { lease:'LS0003', renter:'Marco Rivera',  property:'Sunrise Towers',    unit:'7C', collected:0,     months:0 },
  { lease:'LS0004', renter:'Aisha Okonkwo', property:'Metro Heights',     unit:'1D', collected:12600, months:6 },
  { lease:'LS0005', renter:'Liam Thompson', property:'Green Valley Block', unit:'5F', collected:10000, months:5 },
]

const FINANCIAL_DATA = [
  { property:'Sunrise Towers',    rentCollected:22450, maintenance:3200, expenses:4800, profit:14450 },
  { property:'Green Valley Block',rentCollected:19250, maintenance:1850, expenses:2900, profit:14500 },
  { property:'Metro Heights',     rentCollected:12600, maintenance:2200, expenses:3100, profit:7300  },
]

const OUTSTANDING_DATA = [
  { lease:'LS0001', renter:'James Carter',  property:'Sunrise Towers',    totalDue:2200, paid:2200, balance:0    },
  { lease:'LS0002', renter:'Priya Sharma',  property:'Green Valley Block', totalDue:1850, paid:1850, balance:0    },
  { lease:'LS0003', renter:'Marco Rivera',  property:'Sunrise Towers',    totalDue:1950, paid:0,    balance:1950 },
  { lease:'LS0004', renter:'Aisha Okonkwo', property:'Metro Heights',     totalDue:2100, paid:2100, balance:0    },
  { lease:'LS0005', renter:'Liam Thompson', property:'Green Valley Block', totalDue:2000, paid:2000, balance:0    },
]

const EXPENSE_DATA = [
  { property:'Sunrise Towers',    category:'Repairs',        title:'Fix leaking pipe Unit 3B', amount:352,  date:'2026-06-01' },
  { property:'Green Valley Block',category:'Administration',  title:'Annual property insurance',amount:2400, date:'2026-05-15' },
  { property:'Sunrise Towers',    category:'Cleaning',        title:'Monthly cleaning contract',amount:577,  date:'2026-06-05' },
  { property:'Metro Heights',     category:'Utilities',       title:'Common area electricity',  amount:180,  date:'2026-06-10' },
  { property:'Green Valley Block',category:'Repairs',         title:'Replace corridor lighting',amount:264,  date:'2026-05-28' },
  { property:'Metro Heights',     category:'Administration',  title:'Lease contract review',    amount:862,  date:'2026-05-20' },
]

const REPORT_TYPES: { key: ReportType; icon:string; label:string; desc:string }[] = [
  { key:'collection', icon:'💳', label:'Rent Collection',   desc:'Payments collected per lease for the period' },
  { key:'financial',  icon:'📈', label:'Financial Summary', desc:'Revenue, costs, and profit per property' },
  { key:'outstanding',icon:'⚠️', label:'Outstanding Ledger',desc:'Amounts owed vs paid per lease' },
  { key:'expense',    icon:'💰', label:'Expense Report',    desc:'All expenses by property and category' },
  { key:'utility',    icon:'⚡', label:'Utility Report',    desc:'Utility bills summary per property' },
  { key:'wtax',       icon:'🧾', label:'Withholding Tax',   desc:'WHT amounts per lease' },
]

export default function ReportsPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [active, setActive] = useState<ReportType>('collection')
  const report = REPORT_TYPES.find(r => r.key === active)!

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{fontSize:26}}>Reports</h1>
          <p className="af-db-subtitle">Financial and operational reports</p>
        </div>
        <button className="af-btn-secondary" style={{cursor:'pointer'}} onClick={()=>alert('Export to PDF — connects to backend in production')}>Export PDF</button>
      </div>

      {/* Report type tabs */}
      <div style={{display:'flex',gap:8,marginBottom:22,flexWrap:'wrap'}}>
        {REPORT_TYPES.map(r => (
          <button key={r.key} onClick={()=>setActive(r.key)} style={{display:'flex',alignItems:'center',gap:7,padding:'8px 14px',borderRadius:9,border:'1px solid',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',borderColor:active===r.key?'var(--accent)':'var(--border2)',background:active===r.key?'rgba(249,115,22,0.12)':'var(--surface)',color:active===r.key?'var(--accent)':'var(--muted)'}}>
            <span>{r.icon}</span>{r.label}
          </button>
        ))}
      </div>

      {/* Report header */}
      <div style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:10,padding:'14px 18px',marginBottom:18}}>
        <div style={{fontWeight:720,fontSize:14}}>{report.icon} {report.label}</div>
        <div style={{fontSize:12.5,color:'var(--muted)',marginTop:2}}>{report.desc}</div>
      </div>

      {/* Collection Report */}
      {active==='collection' && (
        <div className="af-prop-table-wrap">
          <table className="af-prop-table">
            <thead><tr><th>Lease No</th><th>Renter</th><th>Property</th><th>Unit</th><th>Months Paid</th><th>Total Collected</th></tr></thead>
            <tbody>
              {PAYMENT_DATA.map((r,i) => (
                <tr key={i}>
                  <td><span className="af-prop-badge type">{r.lease}</span></td>
                  <td style={{fontWeight:650}}>{r.renter}</td>
                  <td style={{color:'var(--muted)',fontSize:13}}>{r.property}</td>
                  <td>{r.unit}</td>
                  <td style={{textAlign:'center',fontVariantNumeric:'tabular-nums'}}>{r.months}</td>
                  <td style={{fontWeight:700,fontVariantNumeric:'tabular-nums',color:r.collected>0?'var(--text)':'#ef4444'}}>${r.collected.toLocaleString()}</td>
                </tr>
              ))}
              <tr style={{background:'var(--surface2)'}}>
                <td colSpan={5} style={{fontWeight:700,textAlign:'right'}}>Total</td>
                <td style={{fontWeight:800,fontVariantNumeric:'tabular-nums'}}>${PAYMENT_DATA.reduce((s,r)=>s+r.collected,0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Financial Summary */}
      {active==='financial' && (
        <div className="af-prop-table-wrap">
          <table className="af-prop-table">
            <thead><tr><th>Property</th><th>Rent Collected</th><th>Maintenance Cost</th><th>Other Expenses</th><th>Net Profit</th></tr></thead>
            <tbody>
              {FINANCIAL_DATA.map((r,i) => (
                <tr key={i}>
                  <td style={{fontWeight:650}}>{r.property}</td>
                  <td style={{fontVariantNumeric:'tabular-nums',color:'#22c55e',fontWeight:600}}>${r.rentCollected.toLocaleString()}</td>
                  <td style={{fontVariantNumeric:'tabular-nums',color:'#f97316'}}>${r.maintenance.toLocaleString()}</td>
                  <td style={{fontVariantNumeric:'tabular-nums',color:'#f97316'}}>${r.expenses.toLocaleString()}</td>
                  <td style={{fontWeight:750,fontVariantNumeric:'tabular-nums',color:r.profit>0?'#22c55e':'#ef4444'}}>${r.profit.toLocaleString()}</td>
                </tr>
              ))}
              <tr style={{background:'var(--surface2)'}}>
                <td style={{fontWeight:700}}>Total</td>
                <td style={{fontWeight:700,fontVariantNumeric:'tabular-nums'}}>${FINANCIAL_DATA.reduce((s,r)=>s+r.rentCollected,0).toLocaleString()}</td>
                <td style={{fontWeight:700,fontVariantNumeric:'tabular-nums'}}>${FINANCIAL_DATA.reduce((s,r)=>s+r.maintenance,0).toLocaleString()}</td>
                <td style={{fontWeight:700,fontVariantNumeric:'tabular-nums'}}>${FINANCIAL_DATA.reduce((s,r)=>s+r.expenses,0).toLocaleString()}</td>
                <td style={{fontWeight:800,fontVariantNumeric:'tabular-nums',color:'#22c55e'}}>${FINANCIAL_DATA.reduce((s,r)=>s+r.profit,0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Outstanding Ledger */}
      {active==='outstanding' && (
        <div className="af-prop-table-wrap">
          <table className="af-prop-table">
            <thead><tr><th>Lease</th><th>Renter</th><th>Property</th><th>Total Due</th><th>Paid</th><th>Balance</th></tr></thead>
            <tbody>
              {OUTSTANDING_DATA.map((r,i) => (
                <tr key={i}>
                  <td><span className="af-prop-badge type">{r.lease}</span></td>
                  <td style={{fontWeight:650}}>{r.renter}</td>
                  <td style={{color:'var(--muted)',fontSize:13}}>{r.property}</td>
                  <td style={{fontVariantNumeric:'tabular-nums'}}>${r.totalDue.toLocaleString()}</td>
                  <td style={{fontVariantNumeric:'tabular-nums',color:'#22c55e'}}>${r.paid.toLocaleString()}</td>
                  <td style={{fontWeight:700,fontVariantNumeric:'tabular-nums',color:r.balance>0?'#ef4444':'#22c55e'}}>{r.balance>0?`$${r.balance.toLocaleString()}`:'Settled'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Expense Report */}
      {active==='expense' && (
        <div className="af-prop-table-wrap">
          <table className="af-prop-table">
            <thead><tr><th>Date</th><th>Property</th><th>Category</th><th>Title</th><th>Amount</th></tr></thead>
            <tbody>
              {EXPENSE_DATA.map((r,i) => (
                <tr key={i}>
                  <td style={{fontSize:12.5,color:'var(--muted)'}}>{r.date}</td>
                  <td style={{fontWeight:650}}>{r.property}</td>
                  <td><span className="af-prop-badge type">{r.category}</span></td>
                  <td style={{fontSize:13}}>{r.title}</td>
                  <td style={{fontWeight:700,fontVariantNumeric:'tabular-nums'}}>${r.amount.toLocaleString()}</td>
                </tr>
              ))}
              <tr style={{background:'var(--surface2)'}}>
                <td colSpan={4} style={{fontWeight:700,textAlign:'right'}}>Total</td>
                <td style={{fontWeight:800,fontVariantNumeric:'tabular-nums'}}>${EXPENSE_DATA.reduce((s,r)=>s+r.amount,0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {(active==='utility'||active==='wtax') && (
        <div style={{textAlign:'center',padding:'48px 20px',color:'var(--muted)'}}>
          <div style={{fontSize:36,marginBottom:12}}>{report.icon}</div>
          <div style={{fontSize:15,fontWeight:650,marginBottom:6,color:'var(--text)'}}>{report.label}</div>
          <div style={{fontSize:13}}>This report will pull live data once connected to the database.</div>
        </div>
      )}
    </main>
  )
}
