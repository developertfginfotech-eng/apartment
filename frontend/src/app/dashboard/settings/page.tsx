'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
})

const TABS = ['System', 'Wtaxes', 'Property Master', 'Maintenance Master', 'General Expenses Master', 'Documents', 'User & Roles'] as const
type Tab = typeof TABS[number]

/* ---------- System tab ---------- */

interface SettingData {
  company_name: string | null
  logo: string | null
  email: string | null
  phone: string | null
  currency: string | null
  physical_address: string | null
  postal_address: string | null
}

function SystemTab() {
  const [data, setData] = useState<SettingData>({ company_name: '', logo: '', email: '', phone: '', currency: '', physical_address: '', postal_address: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`${API}/setting`, { headers: authHeaders() })
      .then(res => res.json())
      .then(d => d && setData({
        company_name: d.company_name ?? '', logo: d.logo ?? '', email: d.email ?? '', phone: d.phone ?? '',
        currency: d.currency ?? '', physical_address: d.physical_address ?? '', postal_address: d.postal_address ?? '',
      }))
      .finally(() => setLoading(false))
  }, [])

  const uploadLogo = async (file: File) => {
    const body = new FormData()
    body.append('file', file)
    const res = await fetch(`${API}/document/upload`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('apt_token')}` }, body })
    if (!res.ok) return
    const d = await res.json()
    setData(s => ({ ...s, logo: d.url }))
  }

  const save = async () => {
    setSaving(true)
    try {
      await fetch(`${API}/setting`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  if (loading) return <div style={{ color: 'var(--muted)', padding: 24 }}>Loading…</div>

  const F = ({ label, k }: { label: string; k: keyof SettingData }) => (
    <div className="af-field">
      <label>{label}</label>
      <input value={data[k] ?? ''} onChange={e => setData(s => ({ ...s, [k]: e.target.value }))} />
    </div>
  )

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <F label="Company Name" k="company_name" />
        <F label="Email" k="email" />
        <F label="Phone" k="phone" />
        <F label="Currency" k="currency" />
        <F label="Physical Address" k="physical_address" />
        <F label="Postal Address" k="postal_address" />
        <div className="af-field">
          <label>Logo</label>
          <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
          {data.logo && <img src={`${API}${data.logo}`} alt="Logo" style={{ width: 60, height: 60, objectFit: 'contain', marginTop: 8, borderRadius: 8, border: '1px solid var(--border2)' }} />}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, gap: 10, alignItems: 'center' }}>
        {saved && <span style={{ color: '#22c55e', fontSize: 13, fontWeight: 600 }}>✓ Saved</span>}
        <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none' }} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Update'}
        </button>
      </div>
    </div>
  )
}

/* ---------- generic name/display_name/description CRUD tab (Property Master, Maintenance Master) ---------- */

interface MasterRow { id: number; name: string; display_name: string | null; description: string | null; status: number }

function MasterListTab({ basePath }: { basePath: string }) {
  const [rows, setRows] = useState<MasterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', display_name: '', description: '' })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ name: '', display_name: '', description: '' })

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/${basePath}/admin`, { headers: authHeaders() })
      setRows(await res.json())
    } catch { setError('Failed to load') }
    finally { setLoading(false) }
  }, [basePath])

  useEffect(() => { fetchRows() }, [fetchRows])

  const create = async () => {
    if (!form.name.trim()) return
    await fetch(`${API}/${basePath}`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) })
    setForm({ name: '', display_name: '', description: '' })
    setAdding(false)
    fetchRows()
  }

  const startEdit = (r: MasterRow) => {
    setEditingId(r.id)
    setEditForm({ name: r.name, display_name: r.display_name || '', description: r.description || '' })
  }

  const saveEdit = async (id: number) => {
    await fetch(`${API}/${basePath}/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(editForm) })
    setEditingId(null)
    fetchRows()
  }

  const toggleStatus = async (r: MasterRow) => {
    await fetch(`${API}/${basePath}/${r.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status: r.status === 1 ? 0 : 1 }) })
    fetchRows()
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this type?')) return
    await fetch(`${API}/${basePath}/${id}`, { method: 'DELETE', headers: authHeaders() })
    fetchRows()
  }

  if (loading) return <div style={{ color: 'var(--muted)', padding: 24 }}>Loading…</div>

  return (
    <div>
      {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none' }} onClick={() => setAdding(a => !a)}>
          {adding ? 'Cancel' : '+ Add New'}
        </button>
      </div>
      {adding && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, marginBottom: 16, alignItems: 'end' }}>
          <div className="af-field" style={{ margin: 0 }}><label>Name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="af-field" style={{ margin: 0 }}><label>Display Name</label><input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} /></div>
          <div className="af-field" style={{ margin: 0 }}><label>Description</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none', height: 38 }} onClick={create}>Save</button>
        </div>
      )}
      <div className="af-prop-table-wrap">
        <table className="af-prop-table">
          <thead><tr><th>#</th><th>Name</th><th>Display Name</th><th>Description</th><th>Enable/Disable</th><th>Action</th></tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No records found</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                {editingId === r.id ? (
                  <>
                    <td><input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={{ width: '100%' }} /></td>
                    <td><input value={editForm.display_name} onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))} style={{ width: '100%' }} /></td>
                    <td><input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} style={{ width: '100%' }} /></td>
                  </>
                ) : (
                  <>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td style={{ fontSize: 13 }}>{r.display_name || '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--muted)' }}>{r.description || '—'}</td>
                  </>
                )}
                <td>
                  <button
                    type="button" role="switch" aria-checked={r.status === 1} onClick={() => toggleStatus(r)}
                    style={{ width: 40, height: 22, borderRadius: 100, border: 'none', padding: 2, cursor: 'pointer', background: r.status === 1 ? 'var(--accent)' : 'var(--border2)', display: 'inline-flex', alignItems: 'center', justifyContent: r.status === 1 ? 'flex-end' : 'flex-start' }}
                  >
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                  </button>
                </td>
                <td>
                  {editingId === r.id ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="af-prop-act edit" onClick={() => saveEdit(r.id)}>💾</button>
                      <button className="af-prop-act del" onClick={() => setEditingId(null)}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="af-prop-act edit" title="Edit" onClick={() => startEdit(r)}>✏️</button>
                      <button className="af-prop-act del" title="Delete" onClick={() => remove(r.id)}>🗑️</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------- Wtaxes tab ---------- */

interface WtaxRow { id: number; key: string; value: string | number; status: number }

function WtaxesTab() {
  const [rows, setRows] = useState<WtaxRow[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ key: '', value: '' })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ key: '', value: '' })

  const fetchRows = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`${API}/wtax`, { headers: authHeaders() })
    setRows(await res.json())
    setLoading(false)
  }, [])
  useEffect(() => { fetchRows() }, [fetchRows])

  const create = async () => {
    if (!form.key.trim() || !form.value) return
    await fetch(`${API}/wtax`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) })
    setForm({ key: '', value: '' })
    setAdding(false)
    fetchRows()
  }
  const startEdit = (r: WtaxRow) => { setEditingId(r.id); setEditForm({ key: r.key, value: String(r.value) }) }
  const saveEdit = async (id: number) => {
    await fetch(`${API}/wtax/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(editForm) })
    setEditingId(null)
    fetchRows()
  }
  const remove = async (id: number) => {
    if (!confirm('Delete this wtax?')) return
    await fetch(`${API}/wtax/${id}`, { method: 'DELETE', headers: authHeaders() })
    fetchRows()
  }

  if (loading) return <div style={{ color: 'var(--muted)', padding: 24 }}>Loading…</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none' }} onClick={() => setAdding(a => !a)}>{adding ? 'Cancel' : '+ Add New'}</button>
      </div>
      {adding && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, marginBottom: 16, alignItems: 'end' }}>
          <div className="af-field" style={{ margin: 0 }}><label>Name</label><input value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} /></div>
          <div className="af-field" style={{ margin: 0 }}><label>Tax (%)</label><input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></div>
          <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none', height: 38 }} onClick={create}>Save</button>
        </div>
      )}
      <div className="af-prop-table-wrap">
        <table className="af-prop-table">
          <thead><tr><th>#</th><th>Name</th><th>Value</th><th>Action</th></tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No records found</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                {editingId === r.id ? (
                  <>
                    <td><input value={editForm.key} onChange={e => setEditForm(f => ({ ...f, key: e.target.value }))} /></td>
                    <td><input type="number" value={editForm.value} onChange={e => setEditForm(f => ({ ...f, value: e.target.value }))} /></td>
                  </>
                ) : (
                  <>
                    <td style={{ fontWeight: 600 }}>{r.key}</td>
                    <td>{r.value}%</td>
                  </>
                )}
                <td>
                  {editingId === r.id ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="af-prop-act edit" onClick={() => saveEdit(r.id)}>💾</button>
                      <button className="af-prop-act del" onClick={() => setEditingId(null)}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="af-prop-act edit" title="Edit" onClick={() => startEdit(r)}>✏️</button>
                      <button className="af-prop-act del" title="Delete" onClick={() => remove(r.id)}>🗑️</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------- Documents tab ---------- */

interface DocTypeRow { id: number; name: string; status: number }

function DocumentsTab() {
  const [rows, setRows] = useState<DocTypeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  const fetchRows = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`${API}/document/types/admin`, { headers: authHeaders() })
    setRows(await res.json())
    setLoading(false)
  }, [])
  useEffect(() => { fetchRows() }, [fetchRows])

  const create = async () => {
    if (!name.trim()) return
    await fetch(`${API}/document/types`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ name }) })
    setName(''); setAdding(false); fetchRows()
  }
  const toggleStatus = async (r: DocTypeRow) => {
    await fetch(`${API}/document/types/${r.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status: r.status === 1 ? 0 : 1 }) })
    fetchRows()
  }
  const saveEdit = async (id: number) => {
    await fetch(`${API}/document/types/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ name: editName }) })
    setEditingId(null); fetchRows()
  }
  const remove = async (id: number) => {
    if (!confirm('Delete this document type?')) return
    await fetch(`${API}/document/types/${id}`, { method: 'DELETE', headers: authHeaders() })
    fetchRows()
  }

  if (loading) return <div style={{ color: 'var(--muted)', padding: 24 }}>Loading…</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none' }} onClick={() => setAdding(a => !a)}>{adding ? 'Cancel' : '+ Add New'}</button>
      </div>
      {adding && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 16, alignItems: 'end' }}>
          <div className="af-field" style={{ margin: 0 }}><label>Name</label><input value={name} onChange={e => setName(e.target.value)} /></div>
          <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none', height: 38 }} onClick={create}>Save</button>
        </div>
      )}
      <div className="af-prop-table-wrap">
        <table className="af-prop-table">
          <thead><tr><th>#</th><th>Name</th><th>Enable/Disable</th><th>Action</th></tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No records found</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <td style={{ fontWeight: 600 }}>
                  {editingId === r.id ? <input value={editName} onChange={e => setEditName(e.target.value)} /> : r.name}
                </td>
                <td>
                  <button
                    type="button" role="switch" aria-checked={r.status === 1} onClick={() => toggleStatus(r)}
                    style={{ width: 40, height: 22, borderRadius: 100, border: 'none', padding: 2, cursor: 'pointer', background: r.status === 1 ? 'var(--accent)' : 'var(--border2)', display: 'inline-flex', alignItems: 'center', justifyContent: r.status === 1 ? 'flex-end' : 'flex-start' }}
                  >
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                  </button>
                </td>
                <td>
                  {editingId === r.id ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="af-prop-act edit" onClick={() => saveEdit(r.id)}>💾</button>
                      <button className="af-prop-act del" onClick={() => setEditingId(null)}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="af-prop-act edit" title="Edit" onClick={() => { setEditingId(r.id); setEditName(r.name) }}>✏️</button>
                      <button className="af-prop-act del" title="Delete" onClick={() => remove(r.id)}>🗑️</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------- General Expenses Master tab ---------- */

interface GERow { id: number; name: string; display_name: string | null; description: string | null; parent_id: number | null; status: number }

function GeneralExpensesTab() {
  const [rows, setRows] = useState<GERow[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<'category' | 'subcategory' | null>(null)
  const [form, setForm] = useState({ name: '', display_name: '', description: '', parent_id: '' })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ name: '', display_name: '', description: '' })

  const fetchRows = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`${API}/general-expense`, { headers: authHeaders() })
    setRows(await res.json())
    setLoading(false)
  }, [])
  useEffect(() => { fetchRows() }, [fetchRows])

  const categories = rows.filter(r => !r.parent_id)
  const subcategories = rows.filter(r => !!r.parent_id)
  const categoryName = (id: number | null) => categories.find(c => c.id === id)?.name || '—'

  const create = async () => {
    if (!form.name.trim()) return
    const body: Record<string, unknown> = { name: form.name, display_name: form.display_name, description: form.description }
    if (adding === 'subcategory') body.parent_id = form.parent_id ? Number(form.parent_id) : null
    await fetch(`${API}/general-expense`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) })
    setForm({ name: '', display_name: '', description: '', parent_id: '' })
    setAdding(null)
    fetchRows()
  }
  const startEdit = (r: GERow) => { setEditingId(r.id); setEditForm({ name: r.name, display_name: r.display_name || '', description: r.description || '' }) }
  const saveEdit = async (id: number) => {
    await fetch(`${API}/general-expense/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(editForm) })
    setEditingId(null); fetchRows()
  }
  const remove = async (id: number) => {
    if (!confirm('Delete this expense type?')) return
    await fetch(`${API}/general-expense/${id}`, { method: 'DELETE', headers: authHeaders() })
    fetchRows()
  }

  if (loading) return <div style={{ color: 'var(--muted)', padding: 24 }}>Loading…</div>

  const renderRow = (r: GERow, i: number, showParent: boolean) => (
    <tr key={r.id}>
      <td>{i + 1}</td>
      {editingId === r.id ? (
        <>
          <td><input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></td>
          <td><input value={editForm.display_name} onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))} /></td>
          <td><input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} /></td>
        </>
      ) : (
        <>
          <td style={{ fontWeight: 600 }}>{r.name}</td>
          {!showParent && <td style={{ fontSize: 13 }}>{r.display_name || '—'}</td>}
          <td style={{ fontSize: 13, color: 'var(--muted)' }}>{r.description || '—'}</td>
        </>
      )}
      {showParent && <td style={{ fontSize: 13 }}>{categoryName(r.parent_id)}</td>}
      <td>
        {editingId === r.id ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="af-prop-act edit" onClick={() => saveEdit(r.id)}>💾</button>
            <button className="af-prop-act del" onClick={() => setEditingId(null)}>✕</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="af-prop-act edit" title="Edit" onClick={() => startEdit(r)}>✏️</button>
            <button className="af-prop-act del" title="Delete" onClick={() => remove(r.id)}>🗑️</button>
          </div>
        )}
      </td>
    </tr>
  )

  return (
    <div>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Categories</h3>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none' }} onClick={() => setAdding(a => a === 'category' ? null : 'category')}>
          {adding === 'category' ? 'Cancel' : '+ Add Category'}
        </button>
      </div>
      {adding === 'category' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, marginBottom: 16, alignItems: 'end' }}>
          <div className="af-field" style={{ margin: 0 }}><label>Name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="af-field" style={{ margin: 0 }}><label>Display Name</label><input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} /></div>
          <div className="af-field" style={{ margin: 0 }}><label>Description</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none', height: 38 }} onClick={create}>Save</button>
        </div>
      )}
      <div className="af-prop-table-wrap" style={{ marginBottom: 32 }}>
        <table className="af-prop-table">
          <thead><tr><th>#</th><th>Name</th><th>Display Name</th><th>Description</th><th>Action</th></tr></thead>
          <tbody>
            {categories.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No categories found</td></tr>
            ) : categories.map((r, i) => renderRow(r, i, false))}
          </tbody>
        </table>
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Sub-Categories</h3>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none' }} onClick={() => setAdding(a => a === 'subcategory' ? null : 'subcategory')}>
          {adding === 'subcategory' ? 'Cancel' : '+ Add Sub-Category'}
        </button>
      </div>
      {adding === 'subcategory' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, marginBottom: 16, alignItems: 'end' }}>
          <div className="af-field" style={{ margin: 0 }}>
            <label>Parent Category</label>
            <select className="af-select" value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}>
              <option value="">Select…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="af-field" style={{ margin: 0 }}><label>Name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="af-field" style={{ margin: 0 }}><label>Description</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none', height: 38 }} onClick={create}>Save</button>
        </div>
      )}
      <div className="af-prop-table-wrap">
        <table className="af-prop-table">
          <thead><tr><th>#</th><th>Name</th><th>Description</th><th>Parent Category</th><th>Action</th></tr></thead>
          <tbody>
            {subcategories.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No sub-categories found</td></tr>
            ) : subcategories.map((r, i) => renderRow(r, i, true))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------- User & Roles tab ---------- */

function UserRolesTab() {
  const router = useRouter()
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>
        Admin users and module permissions are managed on the Admin Management page.
      </p>
      <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none' }} onClick={() => router.push('/dashboard/admins')}>
        Go to Admin Management
      </button>
    </div>
  )
}

/* ---------- Page ---------- */

export default function SettingsPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])
  const [tab, setTab] = useState<Tab>('System')

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Settings</h1>
          <p className="af-db-subtitle">System configuration and preferences</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, padding: 10 }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                textAlign: 'left', padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
                background: tab === t ? 'var(--accent)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--text)',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ flex: '1 1 640px', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, padding: 22, minWidth: 0 }}>
          {tab === 'System' && <SystemTab />}
          {tab === 'Wtaxes' && <WtaxesTab />}
          {tab === 'Property Master' && <MasterListTab basePath="property-type" />}
          {tab === 'Maintenance Master' && <MasterListTab basePath="maintenance-type" />}
          {tab === 'General Expenses Master' && <GeneralExpensesTab />}
          {tab === 'Documents' && <DocumentsTab />}
          {tab === 'User & Roles' && <UserRolesTab />}
        </div>
      </div>
    </main>
  )
}
