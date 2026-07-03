'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Payroll {
  id: string
  employee: string
  period: string
  startDate: string
  endDate: string
  payDate: string
  basic: number
  allowance: number
  ot: number
  absences: number
  gross: number
  sss: number
  phic: number
  hdmf: number
  paymentLoan: number
  net: number
  checkedBy: string
  approvedBy: string
  status: 'pending' | 'approved'
}

const MONTHS = [
  { value: '', label: '-- Select Month --' },
  { value: '1',  label: 'January'   }, { value: '2',  label: 'February'  },
  { value: '3',  label: 'March'     }, { value: '4',  label: 'April'     },
  { value: '5',  label: 'May'       }, { value: '6',  label: 'June'      },
  { value: '7',  label: 'July'      }, { value: '8',  label: 'August'    },
  { value: '9',  label: 'September' }, { value: '10', label: 'October'   },
  { value: '11', label: 'November'  }, { value: '12', label: 'December'  },
]

function compute(basic: number, allowance: number, ot: number, absences: number, sss: number, phic: number, hdmf: number, paymentLoan: number) {
  const gross = basic + allowance + ot - absences
  const net   = gross - sss - phic - hdmf - paymentLoan
  return { gross, net }
}

function build(raw: Omit<Payroll, 'gross' | 'net'>): Payroll {
  const { gross, net } = compute(raw.basic, raw.allowance, raw.ot, raw.absences, raw.sss, raw.phic, raw.hdmf, raw.paymentLoan)
  return { ...raw, gross, net }
}

const SEED: Payroll[] = [
  build({ id:'pr1', employee:'Carlos Mendez', period:'Jun 1–30 2026', startDate:'2026-06-01', endDate:'2026-06-30', payDate:'2026-06-30', basic:25000, allowance:3000, ot:2500, absences:0,    sss:1125, phic:500, hdmf:200, paymentLoan:0,    checkedBy:'HR Manager', approvedBy:'', status:'pending' }),
  build({ id:'pr2', employee:'Diana Park',    period:'Jun 1–30 2026', startDate:'2026-06-01', endDate:'2026-06-30', payDate:'2026-06-30', basic:35000, allowance:5000, ot:0,    absences:1500, sss:1575, phic:700, hdmf:200, paymentLoan:2000, checkedBy:'HR Manager', approvedBy:'Super Admin', status:'approved' }),
  build({ id:'pr3', employee:'Felix Osei',    period:'Jun 1–30 2026', startDate:'2026-06-01', endDate:'2026-06-30', payDate:'2026-06-30', basic:18000, allowance:2000, ot:1800, absences:0,    sss:810,  phic:360, hdmf:200, paymentLoan:500,  checkedBy:'HR Manager', approvedBy:'', status:'pending' }),
  build({ id:'pr4', employee:'Aiko Tanaka',   period:'May 1–31 2026', startDate:'2026-05-01', endDate:'2026-05-31', payDate:'2026-05-31', basic:28000, allowance:4000, ot:0,    absences:2000, sss:1260, phic:560, hdmf:200, paymentLoan:1000, checkedBy:'HR Manager', approvedBy:'Super Admin', status:'approved' }),
]

const EMPTY_FORM = {
  employee:'', startDate:'', endDate:'', payDate:'',
  basic:'', allowance:'', ot:'', absences:'',
  sss:'', phic:'', hdmf:'', paymentLoan:'',
  checkedBy:'', approvedBy:'',
}

export default function PayrollPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [payrolls, setPayrolls] = useState<Payroll[]>(SEED)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [filterMonth, setFilterMonth] = useState('')
  const [filterFrom, setFilterFrom]   = useState('')
  const [filterTo, setFilterTo]       = useState('')

  const n = (v: string) => parseFloat(v) || 0

  const liveGross = n(form.basic) + n(form.allowance) + n(form.ot) - n(form.absences)
  const liveNet   = liveGross - n(form.sss) - n(form.phic) - n(form.hdmf) - n(form.paymentLoan)

  const approve = (id: string) =>
    setPayrolls(ps => ps.map(p => p.id === id ? { ...p, status: 'approved', approvedBy: 'Super Admin' } : p))

  const resetForm = () => setForm(EMPTY_FORM)

  const save = () => {
    if (!form.employee || !form.startDate || !form.endDate || !form.payDate) return
    const month = form.startDate ? String(new Date(form.startDate).getMonth() + 1) : ''
    const start = form.startDate, end = form.endDate
    const period = start && end ? `${start} – ${end}` : ''
    setPayrolls(ps => [...ps, build({
      id: `pr${Date.now()}`,
      employee: form.employee, period,
      startDate: form.startDate, endDate: form.endDate, payDate: form.payDate,
      basic: n(form.basic), allowance: n(form.allowance), ot: n(form.ot), absences: n(form.absences),
      sss: n(form.sss), phic: n(form.phic), hdmf: n(form.hdmf), paymentLoan: n(form.paymentLoan),
      checkedBy: form.checkedBy, approvedBy: form.approvedBy,
      status: 'pending',
    })])
    setShowForm(false); resetForm()
    void month
  }

  const exportCSV = () => {
    const headers = ['#','Employee','Start Date','End Date','Pay Date','Basic','Allowance','OT','Absences','Gross','SSS','PhilHealth','Pag-IBIG','Payment Loan','Net Pay','Checked By','Approved By','Status']
    const rows = filtered.map((p, i) => [
      i+1, p.employee, p.startDate, p.endDate, p.payDate,
      p.basic, p.allowance, p.ot, p.absences, p.gross,
      p.sss, p.phic, p.hdmf, p.paymentLoan, p.net,
      p.checkedBy, p.approvedBy, p.status,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'payroll.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = payrolls.filter(p => {
    if (filterMonth) {
      const m = new Date(p.startDate).getMonth() + 1
      if (String(m) !== filterMonth) return false
    }
    if (filterFrom && p.startDate < filterFrom) return false
    if (filterTo   && p.endDate   > filterTo)   return false
    return true
  })

  const totalNet      = filtered.reduce((s, p) => s + p.net, 0)
  const pendingCount  = filtered.filter(p => p.status === 'pending').length
  const approvedCount = filtered.filter(p => p.status === 'approved').length

  const fmt = (v: number) => v.toLocaleString()

  const field = (key: keyof typeof form, label: string, placeholder = '', type = 'number') => (
    <div className="af-field">
      <label>{label}</label>
      <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
    </div>
  )

  return (
    <main className="af-db-main">
      {/* Header */}
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Payroll</h1>
          <p className="af-db-subtitle">Employee salary and payroll management</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={exportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: 650, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ↓ Export
          </button>
          <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none' }} onClick={() => { resetForm(); setShowForm(true) }}>
            + Add New
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="af-field" style={{ margin: 0, minWidth: 170 }}>
          <label style={{ fontSize: 11.5 }}>Select Month</label>
          <select className="af-select" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="af-field" style={{ margin: 0, minWidth: 150 }}>
          <label style={{ fontSize: 11.5 }}>From Date</label>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={{ padding: '8px 12px' }} />
        </div>
        <div className="af-field" style={{ margin: 0, minWidth: 150 }}>
          <label style={{ fontSize: 11.5 }}>To Date</label>
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} style={{ padding: '8px 12px' }} />
        </div>
        {(filterMonth || filterFrom || filterTo) && (
          <button onClick={() => { setFilterMonth(''); setFilterFrom(''); setFilterTo('') }}
            style={{ alignSelf: 'flex-end', padding: '8px 14px', borderRadius: 8, background: 'none', border: '1px solid var(--border2)', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            Clear
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Net Payroll', value: `$${fmt(totalNet)}`, color: 'var(--accent)' },
          { label: 'Pending',           value: String(pendingCount),  color: '#f97316' },
          { label: 'Approved',          value: String(approvedCount), color: '#22c55e' },
        ].map(card => (
          <div key={card.label} style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, padding: '18px 24px', minWidth: 160 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="af-prop-table-wrap" style={{ overflowX: 'auto' }}>
        <table className="af-prop-table" style={{ minWidth: 1100 }}>
          <thead>
            <tr>
              <th>#</th>
              <th>Employee</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Payment Date</th>
              <th>Basic Salary</th>
              <th>Allowance</th>
              <th>OT</th>
              <th>Payment Loan</th>
              <th>Net Pay</th>
              <th>Checked By</th>
              <th>Approved By</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={14} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>No payroll records found</td></tr>
            ) : filtered.map((p, i) => (
              <tr key={p.id}>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{i + 1}</td>
                <td style={{ fontWeight: 700 }}>{p.employee}</td>
                <td style={{ fontSize: 12.5 }}>{p.startDate}</td>
                <td style={{ fontSize: 12.5 }}>{p.endDate}</td>
                <td style={{ fontSize: 12.5 }}>{p.payDate}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>${fmt(p.basic)}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>${fmt(p.allowance)}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>${fmt(p.ot)}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums', color: p.paymentLoan > 0 ? '#ef4444' : 'var(--muted)' }}>
                  {p.paymentLoan > 0 ? `-$${fmt(p.paymentLoan)}` : '—'}
                </td>
                <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#22c55e' }}>${fmt(p.net)}</td>
                <td style={{ fontSize: 12, color: 'var(--muted)' }}>{p.checkedBy || '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--muted)' }}>{p.approvedBy || '—'}</td>
                <td>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, textTransform: 'capitalize',
                    background: p.status === 'approved' ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.12)',
                    color: p.status === 'approved' ? '#22c55e' : '#f97316',
                  }}>{p.status}</span>
                </td>
                <td>
                  {p.status === 'pending' && (
                    <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none', padding: '5px 14px', fontSize: 12 }} onClick={() => approve(p.id)}>
                      Approve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Payroll Modal */}
      {showForm && (
        <div className="af-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="af-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="af-modal-title">Add Payroll</h2>
            <div className="af-modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="af-field" style={{ gridColumn: 'span 2' }}>
                  <label>Employee Name</label>
                  <input type="text" value={form.employee} onChange={e => setForm(f => ({ ...f, employee: e.target.value }))} placeholder="Full name" />
                </div>
                <div className="af-field">
                  <label>Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="af-field">
                  <label>End Date</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
                <div className="af-field" style={{ gridColumn: 'span 2' }}>
                  <label>Payment Date</label>
                  <input type="date" value={form.payDate} onChange={e => setForm(f => ({ ...f, payDate: e.target.value }))} />
                </div>

                <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border2)', paddingTop: 12, fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Earnings</div>
                {field('basic',     'Basic Salary',     '25000')}
                {field('allowance', 'Allowance',        '3000')}
                {field('ot',        'Overtime Pay',     '0')}
                {field('absences',  'Absences (deduct)','0')}

                <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border2)', paddingTop: 12, fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Deductions</div>
                {field('sss',         'SSS',          '1125')}
                {field('phic',        'PhilHealth',   '500')}
                {field('hdmf',        'Pag-IBIG',     '200')}
                {field('paymentLoan', 'Payment Loan', '0')}

                <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border2)', paddingTop: 12, fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Signatories</div>
                {field('checkedBy',  'Checked By',  'HR Manager', 'text')}
                {field('approvedBy', 'Approved By', 'Director',   'text')}
              </div>

              {/* Live preview */}
              <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '14px 18px', marginTop: 16, display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Gross Pay</div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>${liveGross.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Net Pay</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>${liveNet.toLocaleString()}</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setShowForm(false)}>Cancel</button>
              <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 28px' }} onClick={save}>Add Payroll</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
