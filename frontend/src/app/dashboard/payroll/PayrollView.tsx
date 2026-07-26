'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/date'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Payroll {
  id: number
  employee_name: string
  start_date: string
  end_date: string
  payment_date: string
  basic: number
  ot_pay: number
  allowance: number
  adjustment: number
  rental: number
  absences: number
  late: number
  sss: number
  phic: number
  hdmf: number
  sss_loan: number
  hdmf_loan: number
  cash_advance: number
  net_pay: number
  checked_by_name: string
  approved_by_name: string
}

function Field({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px' }}>
      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: color ?? 'var(--text)' }}>{value}</div>
    </div>
  )
}

export default function PayrollView({ payrollId }: { payrollId: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [payroll, setPayroll] = useState<Payroll | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/payroll/${payrollId}`, { headers: authHeaders() })
      if (!res.ok) throw new Error()
      setPayroll(await res.json())
    } catch { setError('Failed to load payroll record') }
    finally { setLoading(false) }
  }, [payrollId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const fmt = (v: number | string) => `₱ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }

  if (error || !payroll) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: '#ef4444' }}>{error || 'Payroll record not found'}</div></main>
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Payroll Details for {payroll.employee_name || '—'}</h1>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/payroll')}>← Back to Payroll</button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 780 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 22 }}>
          <Field label="Employee" value={payroll.employee_name || '—'} />
          <Field label="Start Date" value={formatDate(payroll.start_date)} />
          <Field label="End Date" value={formatDate(payroll.end_date)} />
          <Field label="Payment Date" value={formatDate(payroll.payment_date)} />
        </div>

        <div style={{ fontSize: 13, fontWeight: 750, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Earnings</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 22 }}>
          <Field label="Basic Pay" value={fmt(payroll.basic)} />
          <Field label="OT Pay" value={fmt(payroll.ot_pay)} />
          <Field label="Allowance" value={fmt(payroll.allowance)} />
          <Field label="Adjustment" value={fmt(payroll.adjustment)} />
        </div>

        <div style={{ fontSize: 13, fontWeight: 750, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Deductions &amp; Contributions</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 22 }}>
          <Field label="Rental" value={fmt(payroll.rental)} />
          <Field label="Absences" value={fmt(payroll.absences)} />
          <Field label="Late" value={fmt(payroll.late)} />
          <Field label="SSS" value={fmt(payroll.sss)} />
          <Field label="PhilHealth" value={fmt(payroll.phic)} />
          <Field label="Pag-IBIG" value={fmt(payroll.hdmf)} />
          <Field label="SSS Loan" value={fmt(payroll.sss_loan)} />
          <Field label="HDMF Loan" value={fmt(payroll.hdmf_loan)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 22 }}>
          <Field label="Cash Advance" value={fmt(payroll.cash_advance)} />
          <Field label="Checked By" value={payroll.checked_by_name || '—'} />
          <Field label="Approved By" value={payroll.approved_by_name || '—'} />
        </div>

        <div style={{ maxWidth: 260 }}>
          <Field label="Net Pay" value={fmt(payroll.net_pay)} color="#22c55e" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
          <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/payroll')}>Back to List</button>
        </div>
      </div>
    </main>
  )
}
