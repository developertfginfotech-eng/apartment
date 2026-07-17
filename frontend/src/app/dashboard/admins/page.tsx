'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Pagination, { usePagination } from '@/components/Pagination'
import { formatDate } from '@/lib/date'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

const MODULES = [
  'properties', 'owners', 'tenants', 'leases', 'payments', 'maintenance', 'vendors',
  'expenses', 'utilities', 'messages', 'notice-board', 'reports',
  'activity-logs', 'loan', 'security-money', 'payroll', 'taxes', 'settings',
]
const MODULE_LABELS: Record<string, string> = {
  properties: 'Properties', owners: 'Owners', tenants: 'Renters', leases: 'Lease Agreement',
  payments: 'Payments', maintenance: 'Maintenance', vendors: 'Vendors', expenses: 'Expenses', utilities: 'Utilities',
  messages: 'Messages', 'notice-board': 'Notice Board', reports: 'Reports',
  'activity-logs': 'Activity Logs', loan: 'Loan', 'security-money': 'Security Money',
  payroll: 'Payroll', taxes: 'Taxes', settings: 'Setting',
}
const ACTIONS = ['read', 'create', 'update', 'delete']

interface Admin {
  id: string
  name: string
  email: string
  role: string
  permissions: { module: string; actions: string[] }[]
  createdAt: string
}

const EMPTY_FORM = { name: '', email: '', password: '' }

export default function AdminsPage() {
  const router   = useRouter()
  const [token, setToken]   = useState('')
  const [admins, setAdmins] = useState<Admin[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Admin | null>(null)
  const [perms, setPerms]   = useState<Record<string, string[]>>({})
  const [form, setForm]     = useState(EMPTY_FORM)
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchAdmins = (t: string) => {
    fetch(`${API}/auth/admins`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(data => Array.isArray(data) && setAdmins(data))
  }

  useEffect(() => {
    const t    = localStorage.getItem('apt_token') ?? ''
    const user = JSON.parse(localStorage.getItem('apt_user') ?? '{}')
    if (!t || user.role !== 'super_admin') { router.push('/dashboard'); return }
    setToken(t)
    fetchAdmins(t)
  }, [router])

  const allSelected = MODULES.every(mod => (perms[mod] ?? []).length === ACTIONS.length)

  const toggleAction = (mod: string, action: string) => {
    setPerms(prev => {
      const cur = prev[mod] ?? []
      return { ...prev, [mod]: cur.includes(action) ? cur.filter(a => a !== action) : [...cur, action] }
    })
  }

  const toggleModule = (mod: string) => {
    setPerms(prev => {
      const cur = prev[mod] ?? []
      return { ...prev, [mod]: cur.length === ACTIONS.length ? [] : [...ACTIONS] }
    })
  }

  const toggleAllAccess = () => {
    if (allSelected) {
      setPerms({})
    } else {
      setPerms(Object.fromEntries(MODULES.map(mod => [mod, [...ACTIONS]])))
    }
  }

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setPerms({})
    setError('')
    setShowForm(true)
  }

  const openEdit = (a: Admin) => {
    setEditing(a)
    setForm({ name: a.name, email: a.email, password: '' })
    setPerms(Object.fromEntries(a.permissions.map(p => [p.module, p.actions])))
    setError('')
    setShowForm(true)
  }

  const saveAdmin = async () => {
    const permissions = Object.entries(perms).filter(([, a]) => a.length > 0).map(([module, actions]) => ({ module, actions }))
    setSaving(true); setError('')
    try {
      if (editing) {
        if (!form.name || !form.email) { setError('Name and email are required'); setSaving(false); return }
        const res = await fetch(`${API}/auth/admins/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: form.name, email: form.email, permissions }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message ?? 'Failed')
        setAdmins(prev => prev.map(a => a.id === editing.id ? data : a))
      } else {
        if (!form.name || !form.email || form.password.length < 8) {
          setError('Name, email, and password (8+ chars) are required'); setSaving(false); return
        }
        const res = await fetch(`${API}/auth/admins`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...form, permissions }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message ?? 'Failed')
        setAdmins(prev => [...prev, data.user])
      }
      setShowForm(false); setEditing(null); setForm(EMPTY_FORM); setPerms({})
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await fetch(`${API}/auth/admins/${deleteId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      setAdmins(prev => prev.filter(a => a.id !== deleteId))
    } catch { setError('Failed to delete admin') }
    finally { setDeleteId(null) }
  }

  const { page, setPage, pageSize, pageItems } = usePagination(admins, 10)

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{fontSize:26}}>Admin Management</h1>
          <p className="af-db-subtitle">Create admins and define their module access</p>
        </div>
        <button className="af-btn-primary" style={{cursor:'pointer',border:'none'}} onClick={openCreate}>
          + New Admin
        </button>
      </div>

      {error && !showForm && <div style={{background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#f87171',marginBottom:16}}>{error}</div>}

      {admins.length === 0 ? (
        <div style={{textAlign:'center',padding:'60px 20px',color:'var(--muted)'}}>
          <div style={{fontSize:32,marginBottom:12}}>👤</div>
          <div style={{fontSize:15,fontWeight:600,marginBottom:6}}>No admins yet</div>
          <div style={{fontSize:13}}>Create your first admin and assign them module access</div>
        </div>
      ) : (
        <div className="af-prop-table-wrap">
          <table className="af-prop-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Modules</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(a => (
                <tr key={a.id}>
                  <td style={{fontWeight:650}}>{a.name}</td>
                  <td style={{color:'var(--muted)',fontSize:13}}>{a.email}</td>
                  <td>
                    <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                      {a.permissions.length === 0
                        ? <span style={{color:'var(--muted)',fontSize:12}}>No modules</span>
                        : a.permissions.length === MODULES.length
                          ? <span className="af-prop-badge active">All Access</span>
                          : a.permissions.map(p=>(
                          <span key={p.module} className="af-prop-badge type">{MODULE_LABELS[p.module] ?? p.module}</span>
                        ))}
                    </div>
                  </td>
                  <td style={{color:'var(--muted)',fontSize:12}}>{formatDate(a.createdAt)}</td>
                  <td>
                    <div style={{display:'flex',gap:8}}>
                      <button className="af-prop-act edit" title="Edit" onClick={() => openEdit(a)}>✏️</button>
                      <button className="af-prop-act del" title="Delete" onClick={() => setDeleteId(a.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageSize={pageSize} totalItems={admins.length} onPageChange={setPage} />
        </div>
      )}

      {/* Create / Edit Admin Modal */}
      {showForm && (
        <div className="af-modal-overlay" onClick={()=>setShowForm(false)}>
          <div className="af-modal" style={{maxWidth:560,maxHeight:'85vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <h2 className="af-modal-title">{editing ? 'Edit Admin' : 'New Admin'}</h2>
            {error && <div style={{background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#f87171',marginBottom:16}}>{error}</div>}
            <div className="af-modal-form">
              <div className="af-field"><label>Full name</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Jane Smith"/></div>
              <div className="af-field"><label>Email</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="jane@company.com"/></div>
              {!editing && (
                <div className="af-field"><label>Password (8+ chars)</label><input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="••••••••" minLength={8}/></div>
              )}

              <div style={{marginTop:4}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                  <div style={{fontSize:12,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',color:'var(--muted)'}}>Module access</div>
                  <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12.5,fontWeight:700,color:'var(--accent)'}}>
                    <input type="checkbox" checked={allSelected} onChange={toggleAllAccess} style={{accentColor:'var(--accent)'}}/>
                    All Access
                  </label>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {MODULES.map(mod => {
                    const selected = perms[mod] ?? []
                    return (
                      <div key={mod} style={{background:'var(--surface2)',borderRadius:10,padding:'10px 14px'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:selected.length>0?8:0}}>
                          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13.5,fontWeight:600}}>
                            <input type="checkbox" checked={selected.length>0} onChange={()=>toggleModule(mod)} style={{accentColor:'var(--accent)'}}/>
                            {MODULE_LABELS[mod] ?? mod}
                          </label>
                          {selected.length > 0 && (
                            <span style={{fontSize:10,color:'var(--muted)'}}>
                              {selected.length}/{ACTIONS.length} actions
                            </span>
                          )}
                        </div>
                        {selected.length > 0 && (
                          <div style={{display:'flex',gap:6,flexWrap:'wrap',paddingLeft:22}}>
                            {ACTIONS.map(a=>(
                              <label key={a} style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer',fontSize:12,color:'var(--text2)'}}>
                                <input type="checkbox" checked={selected.includes(a)} onChange={()=>toggleAction(mod,a)} style={{accentColor:'var(--accent)'}}/>
                                {a}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:22,justifyContent:'flex-end'}}>
              <button className="af-btn-secondary" style={{cursor:'pointer'}} onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="af-auth-submit" style={{width:'auto',padding:'10px 24px'}} disabled={saving} onClick={saveAdmin}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId !== null && (
        <div className="af-modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="af-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">Delete Admin</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
              Are you sure you want to delete this admin? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{ flex: 1, padding: '10px', borderRadius: 9, background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', fontWeight: 650, fontSize: 14, fontFamily: 'inherit' }}
                onClick={confirmDelete}
              >
                Delete
              </button>
              <button className="af-btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
