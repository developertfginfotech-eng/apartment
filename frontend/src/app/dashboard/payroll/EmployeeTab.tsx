'use client'

import { useState, useEffect, useCallback } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Employee {
  id: number
  name: string
  date_of_employment: string
  employment_status: string
  payment_type: string
  payment_type_name: string
  mobile_number: string
  bank_name: string
  account_number: string
  SWIFT_BIC_code: string
  tincode: string
  status: number
}

const EMPTY_FORM = {
  name: '', date_of_employment: '', employment_status: 'regular', payment_type: '',
  mobile_number: '', bank_name: '', account_number: '', SWIFT_BIC_code: '', tincode: '',
}

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
})

export default function EmployeeTab() {
  const [rows, setRows]           = useState<Employee[]>([])
  const [salaryStructures, setSalaryStructures] = useState<{id:number;name:string}[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [search, setSearch]       = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [viewItem, setViewItem]   = useState<Employee|null>(null)
  const [editItem, setEditItem]   = useState<Employee|null>(null)
  const [form, setForm]           = useState(EMPTY_FORM)

  const fetchRows = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res  = await fetch(`${API}/employee?${params}`, { headers: authHeaders() })
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch { setError('Failed to load employees') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetchRows() }, [fetchRows])

  useEffect(() => {
    fetch(`${API}/salary-structure`, { headers: authHeaders() })
      .then(r => r.json()).then(d => Array.isArray(d) && setSalaryStructures(d)).catch(()=>{})
  }, [])

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openEdit = (r: Employee) => {
    setEditItem(r)
    setForm({
      name: r.name, date_of_employment: r.date_of_employment, employment_status: r.employment_status,
      payment_type: String(r.payment_type ?? ''), mobile_number: r.mobile_number, bank_name: r.bank_name,
      account_number: r.account_number, SWIFT_BIC_code: r.SWIFT_BIC_code, tincode: r.tincode ?? '',
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.name || !form.date_of_employment || !form.payment_type) return
    try {
      if (editItem) {
        await fetch(`${API}/employee/${editItem.id}`, { method:'PUT', headers:authHeaders(), body:JSON.stringify(form) })
      } else {
        await fetch(`${API}/employee`, { method:'POST', headers:authHeaders(), body:JSON.stringify(form) })
      }
      setShowForm(false); setEditItem(null); setForm(EMPTY_FORM); fetchRows()
    } catch { setError('Failed to save') }
  }

  const remove = async (r: Employee) => {
    if (!confirm(`Delete "${r.name}"?`)) return
    await fetch(`${API}/employee/${r.id}`, { method:'DELETE', headers:authHeaders() })
    fetchRows()
  }

  return (
    <>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:10}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name…"
          style={{background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:8,padding:'8px 12px',color:'var(--text)',fontSize:13,fontFamily:'inherit',width:220}}/>
        <button className="af-btn-primary" style={{cursor:'pointer',border:'none'}} onClick={openAdd}>+ Add New</button>
      </div>

      {error && <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,padding:'10px 16px',marginBottom:16,color:'#ef4444',fontSize:13}}>{error}</div>}

      {loading ? (
        <div style={{textAlign:'center',padding:'60px 0',color:'var(--muted)'}}>Loading…</div>
      ) : (
        <div className="af-prop-table-wrap" style={{overflowX:'auto'}}>
          <table className="af-prop-table" style={{minWidth:800}}>
            <thead>
              <tr><th>#</th><th>Name</th><th>Employment Status</th><th>Payment Type</th><th>Mobile</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.length===0 ? (
                <tr><td colSpan={6} style={{textAlign:'center',padding:'40px',color:'var(--muted)'}}>No records found</td></tr>
              ) : rows.map((r,i)=>(
                <tr key={r.id}>
                  <td>{i+1}</td>
                  <td>{r.name}</td>
                  <td>{r.employment_status}</td>
                  <td>{r.payment_type_name || '—'}</td>
                  <td>{r.mobile_number}</td>
                  <td>
                    <button onClick={()=>openEdit(r)} title="Edit" style={{background:'none',border:'none',cursor:'pointer',color:'var(--accent)',marginRight:10}}>✎</button>
                    <button onClick={()=>setViewItem(r)} title="View" style={{background:'none',border:'none',cursor:'pointer',color:'#3b82f6',marginRight:10}}>👁</button>
                    <button onClick={()=>remove(r)} title="Delete" style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444'}}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="af-modal-overlay" onClick={()=>setShowForm(false)}>
          <div className="af-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:560,maxHeight:'90vh',overflowY:'auto'}}>
            <h2 className="af-modal-title">{editItem?'Edit Employee':'Add Employee'}</h2>
            <div className="af-modal-form">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="af-field" style={{gridColumn:'span 2'}}><label>Name</label>
                  <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
                <div className="af-field"><label>Date of Employment</label>
                  <input type="date" value={form.date_of_employment} onChange={e=>setForm(f=>({...f,date_of_employment:e.target.value}))}/></div>
                <div className="af-field"><label>Employment Status</label>
                  <select className="af-select" value={form.employment_status} onChange={e=>setForm(f=>({...f,employment_status:e.target.value}))}>
                    <option value="regular">Regular</option>
                    <option value="non-regular">Non-Regular</option>
                  </select></div>
                <div className="af-field"><label>Payment Type</label>
                  <select className="af-select" value={form.payment_type} onChange={e=>setForm(f=>({...f,payment_type:e.target.value}))}>
                    <option value="">-- Select --</option>
                    {salaryStructures.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select></div>
                <div className="af-field"><label>Mobile Number</label>
                  <input value={form.mobile_number} onChange={e=>setForm(f=>({...f,mobile_number:e.target.value}))}/></div>
                <div className="af-field"><label>Bank Name</label>
                  <input value={form.bank_name} onChange={e=>setForm(f=>({...f,bank_name:e.target.value}))}/></div>
                <div className="af-field"><label>Account Number</label>
                  <input value={form.account_number} onChange={e=>setForm(f=>({...f,account_number:e.target.value}))}/></div>
                <div className="af-field"><label>SWIFT/BIC Code</label>
                  <input value={form.SWIFT_BIC_code} onChange={e=>setForm(f=>({...f,SWIFT_BIC_code:e.target.value}))}/></div>
                <div className="af-field"><label>TIN Code</label>
                  <input value={form.tincode} onChange={e=>setForm(f=>({...f,tincode:e.target.value}))}/></div>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:22,justifyContent:'flex-end'}}>
              <button className="af-btn-secondary" style={{cursor:'pointer'}} onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="af-auth-submit" style={{width:'auto',padding:'10px 28px'}} onClick={save}>{editItem?'Save Changes':'Add'}</button>
            </div>
          </div>
        </div>
      )}

      {viewItem && (
        <div className="af-modal-overlay" onClick={()=>setViewItem(null)}>
          <div className="af-modal" style={{maxWidth:480}} onClick={e=>e.stopPropagation()}>
            <h2 className="af-modal-title">Employee Details</h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:10}}>
              {[
                ['Name', viewItem.name],
                ['Date of Employment', viewItem.date_of_employment],
                ['Employment Status', viewItem.employment_status],
                ['Payment Type', viewItem.payment_type_name],
                ['Mobile', viewItem.mobile_number],
                ['Bank Name', viewItem.bank_name],
                ['Account Number', viewItem.account_number],
                ['SWIFT/BIC Code', viewItem.SWIFT_BIC_code],
                ['TIN Code', viewItem.tincode],
              ].map(([k,v])=>(
                <div key={k}>
                  <div style={{fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>{k}</div>
                  <div style={{fontSize:14,fontWeight:600}}>{v || '—'}</div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:22}}>
              <button className="af-btn-secondary" style={{cursor:'pointer'}} onClick={()=>setViewItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
