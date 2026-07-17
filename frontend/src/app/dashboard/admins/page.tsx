'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Pagination, { usePagination } from '@/components/Pagination'
import { formatDate } from '@/lib/date'
import { MODULES, MODULE_LABELS, Admin } from './permissions'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export default function AdminsPage() {
  const router   = useRouter()
  const [token, setToken]   = useState('')
  const [admins, setAdmins] = useState<Admin[]>([])
  const [error, setError]   = useState('')
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
        <button className="af-btn-primary" style={{cursor:'pointer',border:'none'}} onClick={() => router.push('/dashboard/admins/new')}>
          + New Admin
        </button>
      </div>

      {error && <div style={{background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#f87171',marginBottom:16}}>{error}</div>}

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
                      <button className="af-prop-act edit" title="Edit" onClick={() => router.push(`/dashboard/admins/edit?id=${a.id}`)}>✏️</button>
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
