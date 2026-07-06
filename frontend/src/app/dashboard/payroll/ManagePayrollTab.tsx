'use client'

import { useState, useEffect, useCallback } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Batch { id: number; name: string; start_date: string; end_date: string; status: number }
interface PayrollRow {
  id: number; employee_name: string; start_date: string; end_date: string; payment_date: string
  basic: number; net_pay: number; cash_advance: number
  checked_by_name: string; approved_by_name: string
}

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
})

const fmt = (v: number|string) => Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})

export default function ManagePayrollTab() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [search, setSearch]   = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name:'', start_date:'', end_date:'' })

  const [openBatch, setOpenBatch] = useState<Batch|null>(null)
  const [rows, setRows] = useState<PayrollRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailFrom, setDetailFrom] = useState('')
  const [detailTo, setDetailTo]     = useState('')
  const [detailSearch, setDetailSearch] = useState('')

  const fetchBatches = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res  = await fetch(`${API}/manage-payroll?${params}`, { headers: authHeaders() })
      const data = await res.json()
      setBatches(Array.isArray(data) ? data : [])
    } catch { setError('Failed to load manage payroll batches') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetchBatches() }, [fetchBatches])

  const save = async () => {
    if (!form.name || !form.start_date || !form.end_date) return
    await fetch(`${API}/manage-payroll`, { method:'POST', headers:authHeaders(), body:JSON.stringify(form) })
    setShowForm(false); setForm({ name:'', start_date:'', end_date:'' }); fetchBatches()
  }

  const remove = async (b: Batch) => {
    if (!confirm(`Delete "${b.name}"?`)) return
    await fetch(`${API}/manage-payroll/${b.id}`, { method:'DELETE', headers:authHeaders() })
    fetchBatches()
  }

  const fetchDetail = useCallback(async (batch: Batch) => {
    setDetailLoading(true)
    try {
      const params = new URLSearchParams()
      if (detailFrom) params.set('from', detailFrom)
      if (detailTo)   params.set('to', detailTo)
      if (detailSearch) params.set('search', detailSearch)
      const res  = await fetch(`${API}/manage-payroll/${batch.id}?${params}`, { headers: authHeaders() })
      const data = await res.json()
      setRows(data.data ?? [])
    } catch { setError('Failed to load batch payrolls') }
    finally { setDetailLoading(false) }
  }, [detailFrom, detailTo, detailSearch])

  useEffect(() => { if (openBatch) fetchDetail(openBatch) }, [openBatch, fetchDetail])

  if (openBatch) {
    const totalNet = rows.reduce((s,r)=>s+Number(r.net_pay),0)
    return (
      <>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
          <button onClick={()=>{setOpenBatch(null);setRows([]);setDetailFrom('');setDetailTo('');setDetailSearch('')}}
            style={{background:'none',border:'1px solid var(--border2)',borderRadius:8,padding:'6px 12px',color:'var(--text)',cursor:'pointer',fontFamily:'inherit',fontSize:13}}>← Back</button>
          <h3 style={{margin:0,fontSize:16,fontWeight:700}}>{openBatch.name} <span style={{color:'var(--muted)',fontWeight:500,fontSize:13}}>({openBatch.start_date} – {openBatch.end_date})</span></h3>
        </div>

        <div style={{display:'flex',gap:12,marginBottom:18,flexWrap:'wrap',alignItems:'flex-end'}}>
          <div className="af-field" style={{margin:0,minWidth:140}}><label style={{fontSize:11.5}}>From Date</label>
            <input type="date" value={detailFrom} onChange={e=>setDetailFrom(e.target.value)} style={{padding:'8px 10px'}}/></div>
          <div className="af-field" style={{margin:0,minWidth:140}}><label style={{fontSize:11.5}}>To Date</label>
            <input type="date" value={detailTo} onChange={e=>setDetailTo(e.target.value)} style={{padding:'8px 10px'}}/></div>
          <div className="af-field" style={{margin:0,minWidth:180}}><label style={{fontSize:11.5}}>Search</label>
            <input value={detailSearch} onChange={e=>setDetailSearch(e.target.value)} placeholder="Name, basic, net pay…" style={{padding:'8px 10px'}}/></div>
        </div>

        <div style={{marginBottom:16,background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:12,padding:'16px 22px',width:'fit-content'}}>
          <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:6}}>Total Net Pay</div>
          <div style={{fontSize:22,fontWeight:800,color:'var(--accent)'}}>${fmt(totalNet)}</div>
        </div>

        {detailLoading ? (
          <div style={{textAlign:'center',padding:'60px 0',color:'var(--muted)'}}>Loading…</div>
        ) : (
          <div className="af-prop-table-wrap" style={{overflowX:'auto'}}>
            <table className="af-prop-table" style={{minWidth:900}}>
              <thead><tr><th>#</th><th>Employee</th><th>Period</th><th>Basic</th><th>C.A.</th><th>Net Pay</th><th>Checked By</th><th>Approved By</th></tr></thead>
              <tbody>
                {rows.length===0 ? (
                  <tr><td colSpan={8} style={{textAlign:'center',padding:'40px',color:'var(--muted)'}}>No approved payrolls in this period</td></tr>
                ) : rows.map((r,i)=>(
                  <tr key={r.id}>
                    <td>{i+1}</td>
                    <td>{r.employee_name}</td>
                    <td>{r.start_date} – {r.end_date}</td>
                    <td>{fmt(r.basic)}</td>
                    <td>{fmt(r.cash_advance)}</td>
                    <td style={{color:'#22c55e',fontWeight:700}}>{fmt(r.net_pay)}</td>
                    <td>{r.checked_by_name ?? ''}</td>
                    <td>{r.approved_by_name ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:10}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name…"
          style={{background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:8,padding:'8px 12px',color:'var(--text)',fontSize:13,fontFamily:'inherit',width:220}}/>
        <button className="af-btn-primary" style={{cursor:'pointer',border:'none'}} onClick={()=>setShowForm(true)}>+ Add New</button>
      </div>

      {error && <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,padding:'10px 16px',marginBottom:16,color:'#ef4444',fontSize:13}}>{error}</div>}

      {loading ? (
        <div style={{textAlign:'center',padding:'60px 0',color:'var(--muted)'}}>Loading…</div>
      ) : (
        <div className="af-prop-table-wrap" style={{overflowX:'auto'}}>
          <table className="af-prop-table" style={{minWidth:600}}>
            <thead><tr><th>#</th><th>Name</th><th>Start Date</th><th>End Date</th><th>Action</th></tr></thead>
            <tbody>
              {batches.length===0 ? (
                <tr><td colSpan={5} style={{textAlign:'center',padding:'40px',color:'var(--muted)'}}>No data available</td></tr>
              ) : batches.map((b,i)=>(
                <tr key={b.id}>
                  <td>{i+1}</td>
                  <td>{b.name}</td>
                  <td>{b.start_date}</td>
                  <td>{b.end_date}</td>
                  <td>
                    <button onClick={()=>setOpenBatch(b)} title="View" style={{background:'none',border:'none',cursor:'pointer',color:'#3b82f6',marginRight:10}}>👁</button>
                    <button onClick={()=>remove(b)} title="Delete" style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444'}}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="af-modal-overlay" onClick={()=>setShowForm(false)}>
          <div className="af-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:440}}>
            <h2 className="af-modal-title">Add Payroll Batch</h2>
            <div className="af-modal-form">
              <div className="af-field"><label>Name</label>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. July 1-15 Payroll" autoFocus/></div>
              <div className="af-field"><label>Start Date</label>
                <input type="date" value={form.start_date} onChange={e=>setForm(f=>({...f,start_date:e.target.value}))}/></div>
              <div className="af-field"><label>End Date</label>
                <input type="date" value={form.end_date} onChange={e=>setForm(f=>({...f,end_date:e.target.value}))}/></div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:22,justifyContent:'flex-end'}}>
              <button className="af-btn-secondary" style={{cursor:'pointer'}} onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="af-auth-submit" style={{width:'auto',padding:'10px 28px'}} onClick={save}>Add</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
