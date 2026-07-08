'use client'

import { useState, useEffect, useCallback } from 'react'
import Pagination, { usePagination } from '@/components/Pagination'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface SalaryStructure { id: number; name: string; status: number }

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
})

export default function SalaryStructureTab() {
  const [rows, setRows]       = useState<SalaryStructure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [search, setSearch]   = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<SalaryStructure|null>(null)
  const [name, setName] = useState('')

  const fetchRows = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res  = await fetch(`${API}/salary-structure?${params}`, { headers: authHeaders() })
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch { setError('Failed to load salary structures') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetchRows() }, [fetchRows])

  const openAdd = () => { setEditItem(null); setName(''); setShowForm(true) }
  const openEdit = (r: SalaryStructure) => { setEditItem(r); setName(r.name); setShowForm(true) }

  const save = async () => {
    if (!name.trim()) return
    try {
      if (editItem) {
        await fetch(`${API}/salary-structure/${editItem.id}`, { method:'PUT', headers:authHeaders(), body:JSON.stringify({ name }) })
      } else {
        await fetch(`${API}/salary-structure`, { method:'POST', headers:authHeaders(), body:JSON.stringify({ name }) })
      }
      setShowForm(false); setEditItem(null); setName(''); fetchRows()
    } catch { setError('Failed to save') }
  }

  const remove = async (r: SalaryStructure) => {
    if (!confirm(`Delete "${r.name}"?`)) return
    await fetch(`${API}/salary-structure/${r.id}`, { method:'DELETE', headers:authHeaders() })
    fetchRows()
  }

  const { page, setPage, pageSize, pageItems } = usePagination(rows, 10)

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
          <table className="af-prop-table" style={{minWidth:500}}>
            <thead><tr><th>#</th><th>Name</th><th>Action</th></tr></thead>
            <tbody>
              {rows.length===0 ? (
                <tr><td colSpan={3} style={{textAlign:'center',padding:'40px',color:'var(--muted)'}}>No records found</td></tr>
              ) : pageItems.map((r,i)=>(
                <tr key={r.id}>
                  <td>{(page-1)*pageSize+i+1}</td>
                  <td>{r.name}</td>
                  <td>
                    <button onClick={()=>openEdit(r)} title="Edit" style={{background:'none',border:'none',cursor:'pointer',color:'var(--accent)',marginRight:10}}>✎</button>
                    <button onClick={()=>remove(r)} title="Delete" style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444'}}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageSize={pageSize} totalItems={rows.length} onPageChange={setPage} />
        </div>
      )}

      {showForm && (
        <div className="af-modal-overlay" onClick={()=>setShowForm(false)}>
          <div className="af-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:420}}>
            <h2 className="af-modal-title">{editItem?'Edit Salary Structure':'Add Salary Structure'}</h2>
            <div className="af-modal-form">
              <div className="af-field">
                <label>Name</label>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Monthly" autoFocus/>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:22,justifyContent:'flex-end'}}>
              <button className="af-btn-secondary" style={{cursor:'pointer'}} onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="af-auth-submit" style={{width:'auto',padding:'10px 28px'}} onClick={save}>{editItem?'Save Changes':'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
