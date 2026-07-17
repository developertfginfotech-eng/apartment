'use client'

import { useState, useCallback } from 'react'
import Pagination, { usePagination } from '@/components/Pagination'
import { formatDate } from '@/lib/date'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface PayslipRow {
  id: number; employee_name: string; start_date: string; end_date: string; payment_date: string
  basic: number; cash_advance: number; net_pay: number
}

interface PayslipDetail {
  id: number; start_date: string; end_date: string; payment_date: string
  basic: number; ot_pay: number; allowance: number; absences: number; late: number; rental: number
  gross_pay: number; sss: number; phic: number; hdmf: number; gross_pay_net: number
  sss_loan: number; hdmf_loan: number; cash_advance: number; adjustment: number; net_pay: number
  employee_name: string; prepared_by_name: string; checked_by_name: string; approved_by_name: string
}

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
})

const fmt = (v: number|string) => Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})

export default function PayslipTab() {
  const [rows, setRows]       = useState<PayslipRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError]     = useState('')
  const [from, setFrom]       = useState('')
  const [to, setTo]           = useState('')
  const [search, setSearch]   = useState('')
  const [detail, setDetail]   = useState<PayslipDetail|null>(null)

  const runSearch = useCallback(async () => {
    setLoading(true); setError(''); setSearched(true)
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to)   params.set('to', to)
      if (search) params.set('search', search)
      const res  = await fetch(`${API}/payroll/payslip?${params}`, { headers: authHeaders() })
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch { setError('Failed to load payslips') }
    finally { setLoading(false) }
  }, [from, to, search])

  const openPayslip = async (r: PayslipRow) => {
    const res = await fetch(`${API}/payroll/${r.id}`, { headers: authHeaders() })
    const data = await res.json()
    setDetail(data)
  }

  const { page, setPage, pageSize, pageItems } = usePagination(rows, 10)

  return (
    <>
      <div style={{display:'flex',gap:12,marginBottom:18,flexWrap:'wrap',alignItems:'flex-end'}}>
        <div className="af-field" style={{margin:0,minWidth:140}}><label style={{fontSize:11.5}}>From Date</label>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{padding:'8px 10px'}}/></div>
        <div className="af-field" style={{margin:0,minWidth:140}}><label style={{fontSize:11.5}}>To Date</label>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{padding:'8px 10px'}}/></div>
        <div className="af-field" style={{margin:0,minWidth:180}}><label style={{fontSize:11.5}}>Search</label>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, basic, date…" style={{padding:'8px 10px'}}/></div>
        <button className="af-btn-primary" style={{cursor:'pointer',border:'none',padding:'9px 22px'}} onClick={runSearch}>Search</button>
      </div>

      {error && <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,padding:'10px 16px',marginBottom:16,color:'#ef4444',fontSize:13}}>{error}</div>}

      {loading ? (
        <div style={{textAlign:'center',padding:'60px 0',color:'var(--muted)'}}>Loading…</div>
      ) : !searched ? (
        <div style={{textAlign:'center',padding:'60px 0',color:'var(--muted)'}}>Set filters and click Search to load payslips.</div>
      ) : (
        <div className="af-prop-table-wrap" style={{overflowX:'auto'}}>
          <table className="af-prop-table" style={{minWidth:700}}>
            <thead><tr><th>Name</th><th>Date</th><th>Basic</th><th>C.A.</th><th>Net Pay</th><th>Payslip</th></tr></thead>
            <tbody>
              {rows.length===0 ? (
                <tr><td colSpan={6} style={{textAlign:'center',padding:'40px',color:'var(--muted)'}}>No data available in table</td></tr>
              ) : pageItems.map(r=>(
                <tr key={r.id}>
                  <td>{r.employee_name}</td>
                  <td>{formatDate(r.start_date)} – {formatDate(r.end_date)}</td>
                  <td>{fmt(r.basic)}</td>
                  <td>{fmt(r.cash_advance)}</td>
                  <td style={{color:'#22c55e',fontWeight:700}}>{fmt(r.net_pay)}</td>
                  <td><button onClick={()=>openPayslip(r)} style={{background:'none',border:'none',color:'var(--accent)',cursor:'pointer',fontFamily:'inherit',fontSize:13,textDecoration:'underline'}}>View Payslip</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageSize={pageSize} totalItems={rows.length} onPageChange={setPage} />
        </div>
      )}

      {detail && (
        <div className="af-modal-overlay" onClick={()=>setDetail(null)}>
          <div className="af-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:520}}>
            <h2 className="af-modal-title">Payslip — {detail.employee_name}</h2>
            <p style={{color:'var(--muted)',fontSize:12,marginTop:-8,marginBottom:16}}>Period: {formatDate(detail.start_date)} – {formatDate(detail.end_date)} · Paid: {formatDate(detail.payment_date)}</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              {[
                ['Basic Pay', detail.basic], ['OT Pay', detail.ot_pay], ['Rental', detail.rental],
                ['Absences', detail.absences], ['Late', detail.late], ['Gross Pay', detail.gross_pay],
                ['SSS', detail.sss], ['PhilHealth', detail.phic], ['Pag-IBIG', detail.hdmf],
                ['Gross Pay Net', detail.gross_pay_net], ['SSS Loan', detail.sss_loan], ['HDMF Loan', detail.hdmf_loan],
                ['Cash Advance', detail.cash_advance], ['Adjustment', detail.adjustment],
              ].map(([k,v])=>(
                <div key={k as string}>
                  <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>{k}</div>
                  <div style={{fontSize:14,fontWeight:600}}>{fmt(v as number)}</div>
                </div>
              ))}
            </div>
            <div style={{background:'var(--surface2)',borderRadius:10,padding:'14px 18px',marginTop:16}}>
              <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>Net Pay</div>
              <div style={{fontSize:22,fontWeight:800,color:'#22c55e'}}>{fmt(detail.net_pay)}</div>
            </div>
            <div style={{marginTop:14,fontSize:12,color:'var(--muted)'}}>
              Prepared By: {detail.prepared_by_name || '—'} · Checked By: {detail.checked_by_name || '—'} · Approved By: {detail.approved_by_name || '—'}
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:22}}>
              <button className="af-btn-secondary" style={{cursor:'pointer'}} onClick={()=>setDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
