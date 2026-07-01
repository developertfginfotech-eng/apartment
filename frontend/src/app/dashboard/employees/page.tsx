'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Employee {
  id: string; name: string; position: string; department: string
  email: string; phone: string; salary: number; joinDate: string
  status: 'active'|'inactive'
}

const SEED: Employee[] = [
  { id:'emp1', name:'Carlos Mendez',  position:'Property Manager',   department:'Operations', email:'carlos@apartment.local', phone:'+1-555-0201', salary:25000, joinDate:'2023-03-15', status:'active' },
  { id:'emp2', name:'Diana Park',     position:'Finance Officer',    department:'Finance',    email:'diana@apartment.local',  phone:'+1-555-0202', salary:35000, joinDate:'2022-07-01', status:'active' },
  { id:'emp3', name:'Felix Osei',     position:'Maintenance Tech',   department:'Operations', email:'felix@apartment.local',  phone:'+1-555-0203', salary:18000, joinDate:'2024-01-10', status:'active' },
  { id:'emp4', name:'Aiko Tanaka',    position:'Admin Assistant',    department:'Admin',      email:'aiko@apartment.local',   phone:'+1-555-0204', salary:28000, joinDate:'2021-11-20', status:'inactive' },
  { id:'emp5', name:'Grace Mensah',   position:'Leasing Agent',      department:'Sales',      email:'grace@apartment.local',  phone:'+1-555-0205', salary:22000, joinDate:'2023-09-05', status:'active' },
]

const DEPARTMENTS = ['Operations','Finance','Admin','Sales','HR']

export default function EmployeesPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [employees, setEmployees] = useState<Employee[]>(SEED)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Employee|null>(null)
  const [form, setForm] = useState({ name:'', position:'', department:DEPARTMENTS[0], email:'', phone:'', salary:'', joinDate:'' })

  const filtered = employees.filter(e => {
    const q = search.toLowerCase()
    return !q || e.name.toLowerCase().includes(q) || e.position.toLowerCase().includes(q) || e.department.toLowerCase().includes(q)
  })

  const openNew = () => { setEditing(null); setForm({ name:'', position:'', department:DEPARTMENTS[0], email:'', phone:'', salary:'', joinDate:'' }); setShowForm(true) }
  const openEdit = (e: Employee) => { setEditing(e); setForm({ name:e.name, position:e.position, department:e.department, email:e.email, phone:e.phone, salary:String(e.salary), joinDate:e.joinDate }); setShowForm(true) }

  const save = () => {
    if (!form.name || !form.position) return
    const entry = { ...form, salary: +form.salary || 0 }
    if (editing) {
      setEmployees(es => es.map(e => e.id===editing.id ? {...e, ...entry} : e))
    } else {
      setEmployees(es => [...es, { id:`emp${Date.now()}`, ...entry, status:'active' as const }])
    }
    setShowForm(false)
  }

  const del = (id: string) => setEmployees(es => es.filter(e => e.id!==id))
  const toggle = (id: string) => setEmployees(es => es.map(e => e.id===id ? {...e, status:e.status==='active'?'inactive':'active'} : e))

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{fontSize:26}}>Employees</h1>
          <p className="af-db-subtitle">{employees.length} total · {employees.filter(e=>e.status==='active').length} active</p>
        </div>
        <button className="af-btn-primary" style={{cursor:'pointer',border:'none'}} onClick={openNew}>+ Add Employee</button>
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
            {filtered.map(e => (
              <tr key={e.id}>
                <td style={{fontWeight:650}}>{e.name}</td>
                <td style={{fontSize:13}}>{e.position}</td>
                <td><span className="af-prop-badge type">{e.department}</span></td>
                <td style={{color:'var(--muted)',fontSize:13}}>{e.email}</td>
                <td style={{fontVariantNumeric:'tabular-nums'}}>${e.salary.toLocaleString()}</td>
                <td style={{fontSize:12.5,color:'var(--muted)'}}>{e.joinDate}</td>
                <td>
                  <button onClick={()=>toggle(e.id)} className={`af-prop-badge ${e.status}`} style={{cursor:'pointer',background:'none',border:'none',font:'inherit',padding:0}}>
                    {e.status==='active'?'● Active':'○ Inactive'}
                  </button>
                </td>
                <td>
                  <div style={{display:'flex',gap:8}}>
                    <button className="af-prop-act edit" onClick={()=>openEdit(e)}>Edit</button>
                    <button className="af-prop-act del" onClick={()=>del(e.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="af-modal-overlay" onClick={()=>setShowForm(false)}>
          <div className="af-modal" onClick={ev=>ev.stopPropagation()}>
            <h2 className="af-modal-title">{editing?'Edit Employee':'Add Employee'}</h2>
            <div className="af-modal-form">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="af-field" style={{gridColumn:'span 2'}}><label>Full name</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Carlos Mendez"/></div>
                <div className="af-field"><label>Position / Job title</label><input value={form.position} onChange={e=>setForm(f=>({...f,position:e.target.value}))} placeholder="Property Manager"/></div>
                <div className="af-field"><label>Department</label>
                  <select className="af-select" value={form.department} onChange={e=>setForm(f=>({...f,department:e.target.value}))}>
                    {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="af-field"><label>Email</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="carlos@company.com"/></div>
                <div className="af-field"><label>Phone</label><input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+1-555-0201"/></div>
                <div className="af-field"><label>Monthly salary ($)</label><input type="number" value={form.salary} onChange={e=>setForm(f=>({...f,salary:e.target.value}))} placeholder="25000"/></div>
                <div className="af-field"><label>Join date</label><input type="date" value={form.joinDate} onChange={e=>setForm(f=>({...f,joinDate:e.target.value}))}/></div>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:22,justifyContent:'flex-end'}}>
              <button className="af-btn-secondary" style={{cursor:'pointer'}} onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="af-auth-submit" style={{width:'auto',padding:'10px 24px'}} onClick={save}>{editing?'Save changes':'Add employee'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
