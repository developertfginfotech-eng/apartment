'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Pagination, { usePagination } from '@/components/Pagination'
import DatePicker from '@/components/DatePicker'
import { formatDate } from '@/lib/date'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface PayslipRow {
  id: number; employee_name: string; start_date: string; end_date: string; payment_date: string
  basic: number; cash_advance: number; net_pay: number
}

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
})

const fmt = (v: number|string) => Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})

export default function PayslipTab() {
  const router = useRouter()
  const [rows, setRows]       = useState<PayslipRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError]     = useState('')
  const [from, setFrom]       = useState('')
  const [to, setTo]           = useState('')
  const [search, setSearch]   = useState('')

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

  useEffect(() => { runSearch() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openPayslip = (r: PayslipRow) => router.push(`/dashboard/payroll/payslip/view?id=${r.id}`)

  const { page, setPage, pageSize, pageItems } = usePagination(rows, 10)

  return (
    <>
      <div style={{display:'flex',gap:12,marginBottom:18,flexWrap:'wrap',alignItems:'flex-end'}}>
        <div className="af-field" style={{margin:0,minWidth:140}}>
          <DatePicker value={from} onChange={setFrom} placeholder="MM-DD-YYYY" /></div>
        <div className="af-field" style={{margin:0,minWidth:140}}>
          <DatePicker value={to} onChange={setTo} placeholder="MM-DD-YYYY" /></div>
        <div className="af-field" style={{margin:0,minWidth:180}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{padding:'8px 10px'}}/></div>
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
                  <td><button onClick={()=>openPayslip(r)} title="View Payslip" style={{background:'none',border:'none',color:'var(--accent)',cursor:'pointer',fontFamily:'inherit',fontSize:16,padding:2}}>👁</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageSize={pageSize} totalItems={rows.length} onPageChange={setPage} />
        </div>
      )}
    </>
  )
}
