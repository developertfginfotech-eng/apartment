'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import FileDropInput from '@/components/FileDropInput'
import DatePicker from '@/components/DatePicker'
import { toDateInputValue } from '@/lib/date'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface GeneralExpense { id: number; name: string; display_name: string | null; parent_id: number | null }
interface Doc { id: number; document_type: number; document: string; document_type_name: string }
interface DocType { id: number; name: string }

const EMPTY_FORM = {
  property_id: '', floor_id: '', unit_id: '',
  title: '', date: '', type: '', sub_category: '',
  famount: '', tax: '', description: '',
}

export default function ExpenseForm({ expenseId }: { expenseId?: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [properties, setProperties] = useState<{ id: number; property_name: string }[]>([])
  const [floors, setFloors] = useState<{ id: number; name: string }[]>([])
  const [units, setUnits] = useState<{ id: number; name: string }[]>([])
  const [taxes, setTaxes] = useState<{ id: number; key: string; value: string }[]>([])
  const [generalExpenses, setGeneralExpenses] = useState<GeneralExpense[]>([])
  const [docTypes, setDocTypes] = useState<DocType[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [newDocType, setNewDocType] = useState('')
  const [newDocFile, setNewDocFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(!!expenseId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  useEffect(() => {
    fetch(`${API}/properties`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setProperties(d)).catch(() => {})
    fetch(`${API}/tax`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setTaxes(d)).catch(() => {})
    fetch(`${API}/general-expense`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setGeneralExpenses(d)).catch(() => {})
    fetch(`${API}/document/types`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setDocTypes(d)).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFloors = useCallback(async (propertyId: string) => {
    if (!propertyId) { setFloors([]); return }
    const res = await fetch(`${API}/property-floor?property_id=${propertyId}`, { headers: authHeaders() })
    const d = await res.json()
    setFloors(Array.isArray(d) ? d : [])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUnits = useCallback(async (propertyId: string, floorId: string) => {
    if (!propertyId || !floorId) { setUnits([]); return }
    const res = await fetch(`${API}/property-unit?property_id=${propertyId}&floor_id=${floorId}`, { headers: authHeaders() })
    const d = await res.json()
    setUnits(Array.isArray(d) ? d : [])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadDocs = useCallback(async (id: number) => {
    const res = await fetch(`${API}/document/expense?expense_id=${id}`, { headers: authHeaders() })
    setDocs(await res.json())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!expenseId) return
    (async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/expenses/${expenseId}`, { headers: authHeaders() })
        const e = await res.json()
        setForm({
          property_id: String(e.property_id ?? ''),
          floor_id: e.floor_id ?? '',
          unit_id: e.unit_id ?? '',
          title: e.title ?? '',
          date: toDateInputValue(e.date),
          type: e.type ?? '',
          sub_category: e.sub_category ?? '',
          famount: e.famount ?? '',
          tax: e.tax ?? '',
          description: e.description ?? '',
        })
        await fetchFloors(String(e.property_id ?? ''))
        await fetchUnits(String(e.property_id ?? ''), e.floor_id ?? '')
        await loadDocs(expenseId)
      } catch { setError('Failed to load expense') }
      finally { setLoading(false) }
    })()
  }, [expenseId, fetchFloors, fetchUnits, loadDocs])

  const categories = generalExpenses.filter(g => !g.parent_id)
  const subCategories = generalExpenses.filter(g => String(g.parent_id) === form.type)

  const finalAmount = ((Number(form.famount) || 0) + (Number(form.famount) || 0) * (Number(form.tax) || 0) / 100).toFixed(2)

  const onPropertyChange = (propertyId: string) => {
    setForm(f => ({ ...f, property_id: propertyId, floor_id: '', unit_id: '' }))
    setUnits([])
    fetchFloors(propertyId)
  }
  const onFloorChange = (floorId: string) => {
    setForm(f => ({ ...f, floor_id: floorId, unit_id: '' }))
    fetchUnits(form.property_id, floorId)
  }
  const onTypeChange = (type: string) => {
    setForm(f => ({ ...f, type, sub_category: '' }))
  }

  const uploadDoc = async () => {
    if (!expenseId || !newDocType || !newDocFile) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', newDocFile)
      const upRes = await fetch(`${API}/document/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('apt_token')}` },
        body: fd,
      })
      const { url } = await upRes.json()
      await fetch(`${API}/document/expense`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ expense_id: expenseId, document_type: parseInt(newDocType, 10), document: url }),
      })
      setNewDocType(''); setNewDocFile(null)
      await loadDocs(expenseId)
    } catch { setError('Failed to upload document') }
    finally { setUploading(false) }
  }

  const removeDoc = async (id: number) => {
    if (!expenseId) return
    await fetch(`${API}/document/expense/${id}`, { method: 'DELETE', headers: authHeaders() })
    await loadDocs(expenseId)
  }

  const save = async () => {
    if (!form.property_id || !form.title || !form.date || !form.famount) return
    setSaving(true); setError('')
    try {
      const body = {
        property_id: parseInt(form.property_id, 10),
        floor_id: form.floor_id || null,
        unit_id: form.unit_id || null,
        title: form.title,
        date: form.date,
        type: form.type || null,
        sub_category: form.sub_category || null,
        famount: form.famount,
        tax: form.tax || 0,
        amount: finalAmount,
        description: form.description,
      }
      const url = expenseId ? `${API}/expenses/${expenseId}` : `${API}/expenses`
      const method = expenseId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      router.push('/dashboard/expenses')
    } catch { setError(expenseId ? 'Failed to update expense' : 'Failed to create expense') }
    finally { setSaving(false) }
  }

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>{expenseId ? 'Edit Expense' : 'Add Expense'}</h1>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/expenses')}>← Back to Expenses</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 820 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div className="af-field">
            <label>Property</label>
            <select className="af-select" value={form.property_id} onChange={e => onPropertyChange(e.target.value)}>
              <option value="">-- Select Property --</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.property_name}</option>)}
            </select>
          </div>
          <div className="af-field">
            <label>Floor</label>
            <select className="af-select" value={form.floor_id} onChange={e => onFloorChange(e.target.value)}>
              <option value="">-- Select Floor --</option>
              {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="af-field">
            <label>Unit</label>
            <select className="af-select" value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))}>
              <option value="">-- Select Unit --</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <div className="af-field" style={{ gridColumn: 'span 2' }}>
            <label>Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Expense title" />
          </div>
          <div className="af-field">
            <label>Date</label>
            <DatePicker value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} />
          </div>

          <div className="af-field">
            <label>Type</label>
            <select className="af-select" value={form.type} onChange={e => onTypeChange(e.target.value)}>
              <option value="">-- Select Type --</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.display_name || c.name}</option>)}
            </select>
          </div>
          <div className="af-field">
            <label>Sub Category</label>
            <select className="af-select" value={form.sub_category} onChange={e => setForm(f => ({ ...f, sub_category: e.target.value }))}>
              <option value="">-- Select Sub Category --</option>
              {subCategories.map(s => <option key={s.id} value={s.id}>{s.display_name || s.name}</option>)}
            </select>
          </div>
          <div className="af-field">
            <label>Amount</label>
            <input type="number" min="0" step="0.01" value={form.famount} onChange={e => setForm(f => ({ ...f, famount: e.target.value }))} placeholder="0.00" />
          </div>

          <div className="af-field">
            <label>Tax (%)</label>
            <select className="af-select" value={form.tax} onChange={e => setForm(f => ({ ...f, tax: e.target.value }))}>
              <option value="">-- Select Tax --</option>
              {taxes.map(t => <option key={t.id} value={t.value}>{t.key} ({t.value}%)</option>)}
            </select>
          </div>
          <div className="af-field">
            <label>Final Amount</label>
            <input readOnly value={finalAmount} style={{ opacity: 0.75 }} />
          </div>

          <div className="af-field" style={{ gridColumn: 'span 3' }}>
            <label>Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Additional notes…"
              rows={3}
              style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 9, padding: '10px 14px', fontSize: 14, color: 'var(--text)', fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
            />
          </div>
        </div>

        {expenseId && (
          <div style={{ marginTop: 20, borderTop: '1px solid var(--border2)', paddingTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Documents</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <select className="af-select" value={newDocType} onChange={e => setNewDocType(e.target.value)} style={{ flex: '1 1 140px' }}>
                <option value="">-- Select Type --</option>
                {docTypes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <div style={{ flex: '1 1 200px' }}>
                <FileDropInput value={newDocFile} onChange={setNewDocFile} placeholder="Choose a document or drag it here" />
              </div>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={uploadDoc} disabled={uploading || !newDocType || !newDocFile}>
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {docs.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>No documents uploaded</div>}
              {docs.map(d => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
                  <a href={`${API}${d.document}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{d.document_type_name ?? 'Document'}</a>
                  <button onClick={() => removeDoc(d.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/expenses')} disabled={saving}>Cancel</button>
          <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : expenseId ? 'Save Changes' : 'Add Expense'}
          </button>
        </div>
      </div>
    </main>
  )
}
