'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MODULES, MODULE_LABELS, ACTIONS, Admin } from './permissions'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

const EMPTY_FORM = { name: '', email: '', password: '' }

export default function AdminForm({ adminId }: { adminId?: string }) {
  const router = useRouter()

  const [token, setToken] = useState('')
  const [perms, setPerms] = useState<Record<string, string[]>>({})
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!!adminId)

  useEffect(() => {
    const t = localStorage.getItem('apt_token') ?? ''
    const user = JSON.parse(localStorage.getItem('apt_user') ?? '{}')
    if (!t || user.role !== 'super_admin') { router.push('/dashboard'); return }
    setToken(t)

    if (!adminId) return
    fetch(`${API}/auth/admins`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then((data: Admin[]) => {
        const a = Array.isArray(data) ? data.find(x => x.id === adminId) : null
        if (a) {
          setForm({ name: a.name, email: a.email, password: '' })
          setPerms(Object.fromEntries(a.permissions.map(p => [p.module, p.actions])))
        } else {
          setError('Admin not found')
        }
      })
      .catch(() => setError('Failed to load admin'))
      .finally(() => setLoading(false))
  }, [adminId, router])

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

  const saveAdmin = async () => {
    const permissions = Object.entries(perms).filter(([, a]) => a.length > 0).map(([module, actions]) => ({ module, actions }))
    setSaving(true); setError('')
    try {
      if (adminId) {
        if (!form.name || !form.email) { setError('Name and email are required'); setSaving(false); return }
        const res = await fetch(`${API}/auth/admins/${adminId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: form.name, email: form.email, permissions }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message ?? 'Failed')
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
      }
      router.push('/dashboard/admins')
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setSaving(false) }
  }

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>{adminId ? 'Edit Admin' : 'New Admin'}</h1>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/admins')}>← Back to Admins</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f87171', marginBottom: 16 }}>{error}</div>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 620 }}>
        <div className="af-modal-form">
          <div className="af-field"><label>Full name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" /></div>
          <div className="af-field"><label>Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" /></div>
          {!adminId && (
            <div className="af-field"><label>Password (8+ chars)</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" minLength={8} /></div>
          )}

          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>Module access</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: 'var(--accent)' }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAllAccess} style={{ accentColor: 'var(--accent)' }} />
                All Access
              </label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {MODULES.map(mod => {
                const selected = perms[mod] ?? []
                return (
                  <div key={mod} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: selected.length > 0 ? 8 : 0 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13.5, fontWeight: 600 }}>
                        <input type="checkbox" checked={selected.length > 0} onChange={() => toggleModule(mod)} style={{ accentColor: 'var(--accent)' }} />
                        {MODULE_LABELS[mod] ?? mod}
                      </label>
                      {selected.length > 0 && (
                        <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                          {selected.length}/{ACTIONS.length} actions
                        </span>
                      )}
                    </div>
                    {selected.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 22 }}>
                        {ACTIONS.map(a => (
                          <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12, color: 'var(--text2)' }}>
                            <input type="checkbox" checked={selected.includes(a)} onChange={() => toggleAction(mod, a)} style={{ accentColor: 'var(--accent)' }} />
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
        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/admins')}>Cancel</button>
          <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} disabled={saving} onClick={saveAdmin}>
            {saving ? 'Saving…' : adminId ? 'Save changes' : 'Create admin'}
          </button>
        </div>
      </div>
    </main>
  )
}
