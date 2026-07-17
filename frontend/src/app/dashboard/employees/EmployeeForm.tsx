'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loadEmployees, saveEmployees, DEPARTMENTS } from './store'

const EMPTY_FORM = { name: '', position: '', department: DEPARTMENTS[0], email: '', phone: '', salary: '', joinDate: '' }

export default function EmployeeForm({ employeeId }: { employeeId?: string }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(!!employeeId)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!employeeId) return
    const e = loadEmployees().find(x => x.id === employeeId)
    if (e) {
      setForm({ name: e.name, position: e.position, department: e.department, email: e.email, phone: e.phone, salary: String(e.salary), joinDate: e.joinDate })
    } else {
      setError('Employee not found')
    }
    setLoading(false)
  }, [employeeId])

  const save = () => {
    if (!form.name || !form.position) return
    const entry = { ...form, salary: +form.salary || 0 }
    const list = loadEmployees()
    if (employeeId) {
      saveEmployees(list.map(e => e.id === employeeId ? { ...e, ...entry } : e))
    } else {
      saveEmployees([...list, { id: `emp${Date.now()}`, ...entry, status: 'active' as const }])
    }
    router.push('/dashboard/employees')
  }

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>{employeeId ? 'Edit Employee' : 'Add Employee'}</h1>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/employees')}>← Back to Employees</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 820 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="af-field" style={{ gridColumn: 'span 2' }}>
            <label>Full name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Carlos Mendez" />
          </div>
          <div className="af-field">
            <label>Position / Job title</label>
            <input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} placeholder="Property Manager" />
          </div>
          <div className="af-field">
            <label>Department</label>
            <select className="af-select" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="af-field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="carlos@company.com" />
          </div>
          <div className="af-field">
            <label>Phone</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1-555-0201" />
          </div>
          <div className="af-field">
            <label>Monthly salary (₱)</label>
            <input type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} placeholder="25000" />
          </div>
          <div className="af-field">
            <label>Join date</label>
            <input type="date" value={form.joinDate} onChange={e => setForm(f => ({ ...f, joinDate: e.target.value }))} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/employees')}>Cancel</button>
          <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save}>
            {employeeId ? 'Save changes' : 'Add employee'}
          </button>
        </div>
      </div>
    </main>
  )
}
