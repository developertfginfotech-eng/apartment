'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Loan {
  id: string
  employee: string
  amount: number
  source: 'Internal' | 'Bank'
  bank: string
  interest: number
  date: string
  paid: boolean
  payDate: string
  status: 'active' | 'inactive'
}

const SEED: Loan[] = [
  { id:'l1', employee:'Carlos Mendez', amount:5000,  source:'Internal', bank:'',              interest:0,   date:'2026-01-15', paid:false, payDate:'',          status:'active'   },
  { id:'l2', employee:'Diana Park',    amount:12000, source:'Bank',     bank:'BDO Bank',      interest:6.5, date:'2025-11-20', paid:true,  payDate:'2026-05-20', status:'active'   },
  { id:'l3', employee:'Felix Osei',    amount:3500,  source:'Internal', bank:'',              interest:0,   date:'2026-03-01', paid:false, payDate:'',          status:'active'   },
  { id:'l4', employee:'Aiko Tanaka',   amount:8000,  source:'Bank',     bank:'Security Bank', interest:8.0, date:'2025-09-10', paid:true,  payDate:'2026-02-10', status:'inactive' },
]

const EMPTY_FORM = { employee:'', amount:'', source:'Internal' as 'Internal'|'Bank', bank:'', interest:'', date:'', paid: false as boolean, status:'active' as 'active'|'inactive' }

export default function LoanPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [loans, setLoans]       = useState<Loan[]>(SEED)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]   = useState<Loan | null>(null)
  const [form, setForm]         = useState(EMPTY_FORM)

  const totalLoans      = loans.reduce((s, l) => s + l.amount, 0)
  const outstanding     = loans.filter(l => !l.paid).reduce((s, l) => s + l.amount, 0)
  const paidAmount      = loans.filter(l => l.paid).reduce((s, l) => s + l.amount, 0)

  const openNew  = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (l: Loan) => {
    setEditing(l)
    setForm({ employee:l.employee, amount:String(l.amount), source:l.source, bank:l.bank, interest:String(l.interest), date:l.date, paid:l.paid, status:l.status })
    setShowModal(true)
  }

  const save = () => {
    if (!form.employee.trim() || !form.amount) return
    const parsed: Omit<Loan,'id'|'payDate'> & { payDate: string } = {
      employee: form.employee,
      amount:   Number(form.amount) || 0,
      source:   form.source,
      bank:     form.source === 'Bank' ? form.bank : '',
      interest: form.source === 'Bank' ? (Number(form.interest) || 0) : 0,
      date:     form.date,
      paid:     form.paid,
      payDate:  form.paid && editing ? editing.payDate : (form.paid ? new Date().toISOString().slice(0,10) : ''),
      status:   form.status,
    }
    if (editing) {
      setLoans(ls => ls.map(l => l.id === editing.id ? { ...l, ...parsed } : l))
    } else {
      setLoans(ls => [...ls, { id:`l${Date.now()}`, ...parsed }])
    }
    setShowModal(false)
  }

  const del      = (id: string) => setLoans(ls => ls.filter(l => l.id !== id))
  const markPaid = (id: string) => setLoans(ls => ls.map(l => l.id === id ? { ...l, paid:true, payDate:new Date().toISOString().slice(0,10) } : l))

  const sf = <K extends keyof typeof EMPTY_FORM>(k: K, v: typeof EMPTY_FORM[K]) => setForm(f => ({ ...f, [k]: v }))

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{fontSize:26}}>Loans</h1>
          <p className="af-db-subtitle">Employee loan tracking &amp; repayment</p>
        </div>
        <button className="af-btn-primary" onClick={openNew} style={{cursor:'pointer',border:'none'}}>+ Add Loan</button>
      </div>

      {/* Summary cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:28}}>
        {[
          { label:'Total Loans',   value:`$${totalLoans.toLocaleString()}`,   sub:`${loans.length} records`,                          color:'var(--accent)' },
          { label:'Outstanding',   value:`$${outstanding.toLocaleString()}`,   sub:`${loans.filter(l=>!l.paid).length} unpaid`,         color:'#ef4444' },
          { label:'Paid',          value:`$${paidAmount.toLocaleString()}`,    sub:`${loans.filter(l=>l.paid).length} cleared`,         color:'#22c55e' },
        ].map(s => (
          <div key={s.label} style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:14,padding:'20px 22px'}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',color:'var(--muted)',marginBottom:8}}>{s.label}</div>
            <div style={{fontSize:26,fontWeight:820,letterSpacing:'-0.03em',color:s.color,fontVariantNumeric:'tabular-nums'}}>{s.value}</div>
            <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="af-prop-table-wrap">
        <table className="af-prop-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Amount ($)</th>
              <th>Source</th>
              <th>Bank Name</th>
              <th>Interest Rate</th>
              <th>Date</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loans.length === 0 && (
              <tr><td colSpan={9} style={{textAlign:'center',color:'var(--muted)',padding:32}}>No loans found</td></tr>
            )}
            {loans.map(l => (
              <tr key={l.id} style={{opacity: l.status === 'inactive' ? 0.6 : 1}}>
                <td style={{fontWeight:650}}>{l.employee}</td>
                <td style={{fontWeight:700,fontVariantNumeric:'tabular-nums'}}>${l.amount.toLocaleString()}</td>
                <td>
                  <span style={{fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:100,background:l.source==='Internal'?'rgba(34,197,94,0.12)':'rgba(59,130,246,0.12)',color:l.source==='Internal'?'#22c55e':'#3b82f6'}}>
                    {l.source}
                  </span>
                </td>
                <td style={{fontSize:13,color:'var(--muted)'}}>{l.bank || '—'}</td>
                <td style={{fontSize:13}}>{l.interest > 0 ? `${l.interest}%` : '—'}</td>
                <td style={{fontSize:13,fontVariantNumeric:'tabular-nums'}}>{l.date}</td>
                <td>
                  <span style={{fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:100,background:l.status==='active'?'rgba(34,197,94,0.12)':'rgba(100,116,139,0.12)',color:l.status==='active'?'#22c55e':'#64748b'}}>
                    {l.status}
                  </span>
                </td>
                <td>
                  <span
                    onClick={() => !l.paid && markPaid(l.id)}
                    style={{fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:100,cursor:l.paid?'default':'pointer',userSelect:'none',background:l.paid?'rgba(34,197,94,0.12)':'rgba(249,115,22,0.12)',color:l.paid?'#22c55e':'#f97316'}}
                    title={l.paid ? `Paid on ${l.payDate}` : 'Click to mark paid'}
                  >
                    {l.paid ? 'paid' : 'pending'}
                  </span>
                </td>
                <td>
                  <div style={{display:'flex',gap:8}}>
                    <button className="af-prop-act edit" onClick={() => openEdit(l)}>Edit</button>
                    <button className="af-prop-act del"  onClick={() => del(l.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="af-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="af-modal" style={{maxWidth:520}} onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">{editing ? 'Edit Loan' : 'Add Loan'}</h2>
            <div className="af-modal-form">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="af-field" style={{gridColumn:'1/-1'}}>
                  <label>Employee Name</label>
                  <input value={form.employee} onChange={e => sf('employee', e.target.value)} placeholder="Carlos Mendez"/>
                </div>
                <div className="af-field">
                  <label>Loan Amount ($)</label>
                  <input type="number" min="0" value={form.amount} onChange={e => sf('amount', e.target.value)} placeholder="5000"/>
                </div>
                <div className="af-field">
                  <label>Loan From</label>
                  <select className="af-select" value={form.source} onChange={e => sf('source', e.target.value as 'Internal'|'Bank')}>
                    <option value="Internal">Internal</option>
                    <option value="Bank">Bank</option>
                  </select>
                </div>

                {/* Conditional: bank fields only when source = Bank */}
                {form.source === 'Bank' && (
                  <>
                    <div className="af-field">
                      <label>Bank Name</label>
                      <input value={form.bank} onChange={e => sf('bank', e.target.value)} placeholder="BDO Bank"/>
                    </div>
                    <div className="af-field">
                      <label>Interest Rate (%)</label>
                      <input type="number" min="0" step="0.1" value={form.interest} onChange={e => sf('interest', e.target.value)} placeholder="6.5"/>
                    </div>
                  </>
                )}

                <div className="af-field">
                  <label>Date of Loan</label>
                  <input type="date" value={form.date} onChange={e => sf('date', e.target.value)}/>
                </div>
                <div className="af-field">
                  <label>Payment Status</label>
                  <select className="af-select" value={form.paid ? 'paid' : 'pending'} onChange={e => sf('paid', e.target.value === 'paid')}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div className="af-field" style={{gridColumn:'1/-1'}}>
                  <label>Loan Status</label>
                  <select className="af-select" value={form.status} onChange={e => sf('status', e.target.value as 'active'|'inactive')}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:22,justifyContent:'flex-end'}}>
              <button className="af-btn-secondary" style={{cursor:'pointer'}} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="af-auth-submit" style={{width:'auto',padding:'10px 24px'}} onClick={save}>
                {editing ? 'Save changes' : 'Add loan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
