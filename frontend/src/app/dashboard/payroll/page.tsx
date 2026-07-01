'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Payroll {
  id: string
  employee: string
  period: string
  basic: number
  allowance: number
  ot: number
  absences: number
  gross: number
  sss: number
  phic: number
  hdmf: number
  net: number
  payDate: string
  status: 'pending' | 'approved'
}

function computePayroll(basic: number, allowance: number, ot: number, absences: number, sss: number, phic: number, hdmf: number): { gross: number; net: number } {
  const gross = basic + allowance + ot - absences
  const net = gross - sss - phic - hdmf
  return { gross, net }
}

function buildPayroll(raw: Omit<Payroll, 'gross' | 'net'>): Payroll {
  const { gross, net } = computePayroll(raw.basic, raw.allowance, raw.ot, raw.absences, raw.sss, raw.phic, raw.hdmf)
  return { ...raw, gross, net }
}

const SEED: Payroll[] = [
  buildPayroll({ id: 'pr1', employee: 'Carlos Mendez', period: 'Jun 1–30 2026', basic: 25000, allowance: 3000, ot: 2500, absences: 0,    sss: 1125, phic: 500, hdmf: 200, payDate: '2026-06-30', status: 'pending' }),
  buildPayroll({ id: 'pr2', employee: 'Diana Park',    period: 'Jun 1–30 2026', basic: 35000, allowance: 5000, ot: 0,    absences: 1500, sss: 1575, phic: 700, hdmf: 200, payDate: '2026-06-30', status: 'approved' }),
  buildPayroll({ id: 'pr3', employee: 'Felix Osei',    period: 'Jun 1–30 2026', basic: 18000, allowance: 2000, ot: 1800, absences: 0,    sss: 810,  phic: 360, hdmf: 200, payDate: '2026-06-30', status: 'pending' }),
  buildPayroll({ id: 'pr4', employee: 'Aiko Tanaka',   period: 'May 1–31 2026', basic: 28000, allowance: 4000, ot: 0,    absences: 2000, sss: 1260, phic: 560, hdmf: 200, payDate: '2026-05-31', status: 'approved' }),
]

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending:  { bg: 'rgba(249,115,22,0.12)', color: '#f97316' },
  approved: { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
}

export default function PayrollPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [payrolls, setPayrolls] = useState<Payroll[]>(SEED)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    employee: '', period: '', basic: '', allowance: '', ot: '', absences: '',
    sss: '', phic: '', hdmf: '', payDate: '',
  })

  const n = (v: string) => parseFloat(v) || 0

  const liveGross = n(form.basic) + n(form.allowance) + n(form.ot) - n(form.absences)
  const liveNet   = liveGross - n(form.sss) - n(form.phic) - n(form.hdmf)

  const approve = (id: string) => {
    setPayrolls(ps => ps.map(p => p.id === id ? { ...p, status: 'approved' } : p))
  }

  const resetForm = () => setForm({ employee: '', period: '', basic: '', allowance: '', ot: '', absences: '', sss: '', phic: '', hdmf: '', payDate: '' })

  const save = () => {
    if (!form.employee || !form.period || !form.payDate) return
    const newP = buildPayroll({
      id: `pr${Date.now()}`,
      employee: form.employee,
      period: form.period,
      basic: n(form.basic),
      allowance: n(form.allowance),
      ot: n(form.ot),
      absences: n(form.absences),
      sss: n(form.sss),
      phic: n(form.phic),
      hdmf: n(form.hdmf),
      payDate: form.payDate,
      status: 'pending',
    })
    setPayrolls(ps => [...ps, newP])
    setShowForm(false)
    resetForm()
  }

  const totalNet     = payrolls.reduce((s, p) => s + p.net, 0)
  const pendingCount  = payrolls.filter(p => p.status === 'pending').length
  const approvedCount = payrolls.filter(p => p.status === 'approved').length

  const fmt = (n: number) => n.toLocaleString()

  const f = (key: keyof typeof form, placeholder: string, label: string, type = 'number') => (
    <div className="af-field">
      <label>{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
      />
    </div>
  )

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Payroll</h1>
          <p className="af-db-subtitle">Employee salary and payroll management</p>
        </div>
        <button className="af-btn-primary" style={{ cursor: 'pointer', border: 'none' }} onClick={() => { resetForm(); setShowForm(true) }}>
          + Add Payroll
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'TOTAL NET PAYROLL', value: `$${fmt(totalNet)}`, color: 'var(--accent)' },
          { label: 'PENDING',   value: String(pendingCount),  color: '#f97316' },
          { label: 'APPROVED',  value: String(approvedCount), color: '#22c55e' },
        ].map(card => (
          <div key={card.label} style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, padding: '18px 24px', minWidth: 160 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="af-prop-table-wrap" style={{ overflowX: 'auto' }}>
        <table className="af-prop-table" style={{ minWidth: 1000 }}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Period</th>
              <th>Basic</th>
              <th>Allowance</th>
              <th>OT</th>
              <th>Absences (-)</th>
              <th>Gross</th>
              <th>Deductions (-)</th>
              <th>Net Pay</th>
              <th>Pay Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payrolls.map(p => {
              const deductions = p.sss + p.phic + p.hdmf
              return (
                <tr key={p.id}>
                  <td style={{ fontWeight: 650 }}>{p.employee}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{p.period}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>${fmt(p.basic)}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>${fmt(p.allowance)}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>${fmt(p.ot)}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', color: '#ef4444' }}>-${fmt(p.absences)}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>${fmt(p.gross)}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', color: '#ef4444' }}>-${fmt(deductions)}</td>
                  <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#22c55e' }}>${fmt(p.net)}</td>
                  <td style={{ fontSize: 12.5 }}>{p.payDate}</td>
                  <td>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100,
                      background: STATUS_STYLE[p.status].bg,
                      color: STATUS_STYLE[p.status].color,
                      textTransform: 'capitalize',
                    }}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    {p.status === 'pending' && (
                      <button
                        className="af-btn-primary"
                        style={{ cursor: 'pointer', border: 'none', padding: '5px 12px', fontSize: 12 }}
                        onClick={() => approve(p.id)}
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="af-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="af-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <h2 className="af-modal-title">Add Payroll</h2>
            <div className="af-modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="af-field" style={{ gridColumn: 'span 2' }}>
                  <label>Employee Name</label>
                  <input
                    type="text"
                    value={form.employee}
                    onChange={e => setForm(f => ({ ...f, employee: e.target.value }))}
                    placeholder="Carlos Mendez"
                  />
                </div>
                <div className="af-field">
                  <label>Period</label>
                  <input
                    type="text"
                    value={form.period}
                    onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                    placeholder="Jun 1–30 2026"
                  />
                </div>
                <div className="af-field">
                  <label>Payment Date</label>
                  <input
                    type="date"
                    value={form.payDate}
                    onChange={e => setForm(f => ({ ...f, payDate: e.target.value }))}
                  />
                </div>
                {f('basic',     '25000', 'Basic Salary')}
                {f('allowance', '3000',  'Allowance')}
                {f('ot',        '0',     'Overtime Pay')}
                {f('absences',  '0',     'Absences (deduction)')}
                {f('sss',       '1125',  'SSS')}
                {f('phic',      '500',   'PhilHealth')}
                {f('hdmf',      '200',   'Pag-IBIG')}
              </div>

              {/* Live computed summary */}
              <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '14px 18px', marginTop: 16, display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>GROSS PAY</div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>${liveGross.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>NET PAY</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>${liveNet.toLocaleString()}</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setShowForm(false)}>Cancel</button>
              <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save}>Add Payroll</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
