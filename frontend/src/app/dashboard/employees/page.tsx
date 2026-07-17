'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Pagination, { usePagination } from '@/components/Pagination'
import { Employee, loadEmployees, saveEmployees } from './store'

export default function EmployeesPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => { setEmployees(loadEmployees()) }, [])

  const filtered = employees.filter(e => {
    const q = search.toLowerCase()
    return !q || e.name.toLowerCase().includes(q) || e.position.toLowerCase().includes(q) || e.department.toLowerCase().includes(q)
  })
  const { page, setPage, pageSize, pageItems } = usePagination(filtered, 10)

  const del = (id: string) => setEmployees(es => { const next = es.filter(e => e.id !== id); saveEmployees(next); return next })
  const toggle = (id: string) => setEmployees(es => { const next = es.map(e => e.id === id ? { ...e, status: e.status === 'active' ? 'inactive' as const : 'active' as const } : e); saveEmployees(next); return next })

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{fontSize:26}}>Employees</h1>
          <p className="af-db-subtitle">{employees.length} total · {employees.filter(e=>e.status==='active').length} active</p>
        </div>
        <button className="af-btn-primary" style={{cursor:'pointer',border:'none'}} onClick={()=>router.push('/dashboard/employees/new')}>+ Add Employee</button>
      </div>

      <div style={{marginBottom:18}}>
        <input className="af-prop-search" placeholder="Search by name, position, department…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <div className="af-prop-table-wrap">
        <table className="af-prop-table">
          <thead>
            <tr><th>Name</th><th>Position</th><th>Department</th><th>Email</th><th>Salary</th><th>Join Date</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length===0 && <tr><td colSpan={8} style={{textAlign:'center',color:'var(--muted)',padding:32}}>No employees found</td></tr>}
            {pageItems.map(e => (
              <tr key={e.id}>
                <td style={{fontWeight:650}}>{e.name}</td>
                <td style={{fontSize:13}}>{e.position}</td>
                <td><span className="af-prop-badge type">{e.department}</span></td>
                <td style={{color:'var(--muted)',fontSize:13}}>{e.email}</td>
                <td style={{fontVariantNumeric:'tabular-nums'}}>₱ {e.salary.toLocaleString()}</td>
                <td style={{fontSize:12.5,color:'var(--muted)'}}>{e.joinDate}</td>
                <td>
                  <button onClick={()=>toggle(e.id)} className={`af-prop-badge ${e.status}`} style={{cursor:'pointer',background:'none',border:'none',font:'inherit',padding:0}}>
                    {e.status==='active'?'● Active':'○ Inactive'}
                  </button>
                </td>
                <td>
                  <div style={{display:'flex',gap:8}}>
                    <button className="af-prop-act edit" title="Edit" onClick={()=>router.push(`/dashboard/employees/edit?id=${e.id}`)}>✏️</button>
                    <button className="af-prop-act del" title="Delete" onClick={()=>del(e.id)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />
      </div>
    </main>
  )
}
