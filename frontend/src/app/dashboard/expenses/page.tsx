'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type ExpenseStatus = 'active' | 'inactive'
type ExpenseCategory = 'Repairs' | 'Utilities' | 'Administration' | 'Cleaning' | 'Other'

interface Expense {
  id: string
  property: string
  type: ExpenseCategory
  sub_category: string
  title: string
  amount: number
  tax: number
  famount: number
  date: string
  description: string
  status: ExpenseStatus
}

const SUBCATEGORIES: Record<ExpenseCategory, string[]> = {
  Repairs:        ['Plumbing', 'Electrical', 'Structural'],
  Utilities:      ['Water', 'Electricity', 'Gas'],
  Administration: ['Legal Fees', 'Accounting', 'Insurance'],
  Cleaning:       ['Common Area', 'Exterior', 'Units'],
  Other:          ['Miscellaneous'],
}

const PROPERTIES = ['Sunrise Towers', 'Green Valley Block', 'Metro Heights']

const CATEGORIES: ExpenseCategory[] = ['Repairs', 'Utilities', 'Administration', 'Cleaning', 'Other']

function calcFinal(amount: number, tax: number): number {
  return Math.round((amount + (amount * tax) / 100) * 100) / 100
}

const SEED: Expense[] = [
  { id: 'e1', property: 'Sunrise Towers',     type: 'Repairs',        sub_category: 'Plumbing',   title: 'Fix leaking pipe Unit 3B',      amount: 320,  tax: 10, famount: calcFinal(320, 10),  date: '2026-06-01', description: '', status: 'active' },
  { id: 'e2', property: 'Green Valley Block',  type: 'Administration', sub_category: 'Insurance',  title: 'Annual property insurance',     amount: 2400, tax: 0,  famount: calcFinal(2400, 0),  date: '2026-05-15', description: '', status: 'active' },
  { id: 'e3', property: 'Sunrise Towers',     type: 'Cleaning',       sub_category: 'Common Area', title: 'Monthly cleaning contract',    amount: 550,  tax: 5,  famount: calcFinal(550, 5),   date: '2026-06-05', description: '', status: 'active' },
  { id: 'e4', property: 'Metro Heights',      type: 'Utilities',      sub_category: 'Electricity', title: 'Common area electricity',      amount: 180,  tax: 0,  famount: calcFinal(180, 0),   date: '2026-06-10', description: '', status: 'active' },
  { id: 'e5', property: 'Green Valley Block', type: 'Repairs',        sub_category: 'Electrical',  title: 'Replace corridor lighting',    amount: 240,  tax: 10, famount: calcFinal(240, 10),  date: '2026-05-28', description: '', status: 'active' },
  { id: 'e6', property: 'Metro Heights',      type: 'Administration', sub_category: 'Legal Fees',  title: 'Lease contract review',        amount: 750,  tax: 15, famount: calcFinal(750, 15),  date: '2026-05-20', description: '', status: 'active' },
]

interface FormState {
  title: string
  property: string
  type: ExpenseCategory
  sub_category: string
  amount: string
  tax: string
  date: string
  description: string
}

const BLANK_FORM: FormState = {
  title: '',
  property: PROPERTIES[0],
  type: 'Repairs',
  sub_category: SUBCATEGORIES['Repairs'][0],
  amount: '',
  tax: '0',
  date: new Date().toISOString().slice(0, 10),
  description: '',
}

let _nextId = 7

export default function ExpensesPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [expenses, setExpenses]     = useState<Expense[]>(SEED)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState<ExpenseCategory | 'All'>('All')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState<Expense | null>(null)
  const [form, setForm]             = useState<FormState>(BLANK_FORM)
  const [deleteId, setDeleteId]     = useState<string | null>(null)

  const liveAmount = parseFloat(form.amount) || 0
  const liveTax    = parseFloat(form.tax) || 0
  const liveFinal  = calcFinal(liveAmount, liveTax)

  const filtered = expenses.filter(e => {
    const q = search.toLowerCase().trim()
    const matchSearch = !q || e.title.toLowerCase().includes(q) || e.property.toLowerCase().includes(q)
    const matchFilter = filter === 'All' || e.type === filter
    return matchSearch && matchFilter
  })

  const totalFinal = filtered.reduce((sum, e) => sum + e.famount, 0)

  function openAdd() {
    setEditTarget(null)
    setForm(BLANK_FORM)
    setModalOpen(true)
  }

  function openEdit(e: Expense) {
    setEditTarget(e)
    setForm({
      title: e.title,
      property: e.property,
      type: e.type,
      sub_category: e.sub_category,
      amount: String(e.amount),
      tax: String(e.tax),
      date: e.date,
      description: e.description,
    })
    setModalOpen(true)
  }

  function setField(key: keyof FormState, value: string) {
    setForm(f => {
      const updated = { ...f, [key]: value }
      // when category changes, reset sub_category to first option
      if (key === 'type') {
        const cat = value as ExpenseCategory
        updated.sub_category = SUBCATEGORIES[cat][0]
      }
      return updated
    })
  }

  function saveExpense() {
    const amountNum = parseFloat(form.amount)
    const taxNum    = parseFloat(form.tax) || 0
    if (!form.title.trim() || isNaN(amountNum) || amountNum <= 0) return
    const entry = {
      title:       form.title.trim(),
      property:    form.property,
      type:        form.type,
      sub_category: form.sub_category,
      amount:      amountNum,
      tax:         taxNum,
      famount:     calcFinal(amountNum, taxNum),
      date:        form.date,
      description: form.description.trim(),
    }
    if (editTarget) {
      setExpenses(prev => prev.map(e => e.id === editTarget.id ? { ...e, ...entry } : e))
    } else {
      setExpenses(prev => [...prev, { id: `e${_nextId++}`, ...entry, status: 'active' }])
    }
    setModalOpen(false)
  }

  function toggleStatus(id: string) {
    setExpenses(prev =>
      prev.map(e => e.id === id ? { ...e, status: e.status === 'active' ? 'inactive' : 'active' } : e)
    )
  }

  function confirmDelete() {
    if (deleteId) setExpenses(prev => prev.filter(e => e.id !== deleteId))
    setDeleteId(null)
  }

  function fmt(n: number) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <main className="af-db-main">

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 className="af-db-greeting">Expenses</h1>
          <p className="af-db-subtitle">{expenses.length} expense{expenses.length !== 1 ? 's' : ''} recorded</p>
        </div>
        <button className="af-btn-primary" onClick={openAdd}>+ Add Expense</button>
      </div>

      {/* ── Search + Category Filter ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 18, alignItems: 'center' }}>
        <input
          className="af-prop-search"
          placeholder="Search by title or property…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: 320 }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['All', ...CATEGORIES] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: '5px 14px',
                borderRadius: 7,
                border: '1px solid var(--border2)',
                background: filter === cat ? 'var(--accent)' : 'var(--surface2)',
                color: filter === cat ? '#fff' : 'var(--text)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.14s, color 0.14s',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="af-prop-table-wrap">
        <table className="af-prop-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Property</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th style={{ textAlign: 'right' }}>Tax %</th>
              <th style={{ textAlign: 'right' }}>Final</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)', padding: '36px 0' }}>
                  No expenses found
                </td>
              </tr>
            ) : (
              filtered.map(e => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.title}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>{e.property}</td>
                  <td>
                    <span className="af-prop-badge type" style={{ marginRight: 4 }}>{e.type}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{e.sub_category}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--muted)' }}>₱ {fmt(e.amount)}</td>
                  <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--muted)' }}>{e.tax}%</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>₱ {fmt(e.famount)}</td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>{e.date}</td>
                  <td>
                    <button
                      className={`af-prop-badge ${e.status}`}
                      onClick={() => toggleStatus(e.id)}
                      style={{
                        cursor: 'pointer',
                        background: 'transparent',
                        border: '1px solid var(--border2)',
                        borderRadius: 6,
                        padding: '3px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                      title="Click to toggle status"
                    >
                      {e.status}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="af-prop-act edit"
                        onClick={() => openEdit(e)}
                        style={{ padding: '4px 14px', fontSize: 12, borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Edit
                      </button>
                      <button
                        className="af-prop-act del"
                        onClick={() => setDeleteId(e.id)}
                        style={{ padding: '4px 14px', fontSize: 12, borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Total Bar ── */}
      <div style={{
        marginTop: 16,
        padding: '14px 20px',
        background: 'var(--surface)',
        border: '1px solid var(--border2)',
        borderRadius: 12,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 500 }}>
          Total ({filtered.length} expense{filtered.length !== 1 ? 's' : ''})
        </span>
        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
          ₱ {fmt(totalFinal)}
        </span>
      </div>

      {/* ── Add / Edit Modal ── */}
      {modalOpen && (
        <div className="af-modal-overlay" onClick={() => setModalOpen(false)}>
          <div
            className="af-modal"
            style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="af-modal-title">{editTarget ? 'Edit Expense' : 'Add Expense'}</h2>
            <div className="af-modal-form">

              <div className="af-field">
                <label>Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setField('title', e.target.value)}
                  placeholder="Expense title"
                />
              </div>

              <div className="af-field">
                <label>Property</label>
                <select className="af-select" value={form.property} onChange={e => setField('property', e.target.value)}>
                  {PROPERTIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="af-field">
                  <label>Category</label>
                  <select className="af-select" value={form.type} onChange={e => setField('type', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="af-field">
                  <label>Subcategory</label>
                  <select className="af-select" value={form.sub_category} onChange={e => setField('sub_category', e.target.value)}>
                    {SUBCATEGORIES[form.type].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="af-field">
                  <label>Amount (₱)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={e => setField('amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="af-field">
                  <label>Tax (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={form.tax}
                    onChange={e => setField('tax', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Live final amount preview */}
              <div style={{
                padding: '10px 14px',
                background: 'var(--surface2)',
                border: '1px solid var(--border2)',
                borderRadius: 9,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Final Amount (incl. tax)</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>
                  ₱ {fmt(liveFinal)}
                </span>
              </div>

              <div className="af-field">
                <label>Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setField('date', e.target.value)}
                />
              </div>

              <div className="af-field">
                <label>Description (optional)</label>
                <textarea
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  placeholder="Additional notes…"
                  rows={3}
                  style={{
                    background: 'var(--surface2)',
                    border: '1px solid var(--border2)',
                    borderRadius: 9,
                    padding: '10px 14px',
                    fontSize: 14,
                    color: 'var(--text)',
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'vertical',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button className="af-auth-submit" style={{ flex: 1 }} onClick={saveExpense}>
                  {editTarget ? 'Save Changes' : 'Add Expense'}
                </button>
                <button
                  className="af-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteId && (
        <div className="af-modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="af-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">Delete Expense</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
              Are you sure you want to delete this expense? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{
                  flex: 1, padding: '10px', borderRadius: 9,
                  background: 'rgba(239,68,68,0.15)', color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.3)',
                  cursor: 'pointer', fontWeight: 650, fontSize: 14, fontFamily: 'inherit',
                }}
                onClick={confirmDelete}
              >
                Delete
              </button>
              <button className="af-btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteId(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
