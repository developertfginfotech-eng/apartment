'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/date'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface PayslipDetail {
  id: number; start_date: string; end_date: string; payment_date: string
  basic: number; ot_pay: number; allowance: number; absences: number; late: number; rental: number
  gross_pay: number; sss: number; phic: number; hdmf: number; gross_pay_net: number
  sss_loan: number; hdmf_loan: number; cash_advance: number; adjustment: number; net_pay: number
  employee_name: string; prepared_by_name: string; checked_by_name: string; approved_by_name: string
}

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
})

const fmt = (v: number | string) => `₱ ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function PayslipView({ payrollId }: { payrollId: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [detail, setDetail] = useState<PayslipDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/payroll/${payrollId}`, { headers: authHeaders() })
      if (!res.ok) throw new Error()
      setDetail(await res.json())
    } catch { setError('Failed to load payslip') }
    finally { setLoading(false) }
  }, [payrollId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }

  if (error || !detail) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: '#ef4444' }}>{error || 'Payslip not found'}</div></main>
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Payslip — {detail.employee_name}</h1>
          <p className="af-db-subtitle">Period: {formatDate(detail.start_date)} – {formatDate(detail.end_date)} · Paid: {formatDate(detail.payment_date)}</p>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/payroll')}>← Back to Payroll</button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 620 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            ['Basic Pay', detail.basic], ['OT Pay', detail.ot_pay], ['Rental', detail.rental],
            ['Absences', detail.absences], ['Late', detail.late], ['Gross Pay', detail.gross_pay],
            ['SSS', detail.sss], ['PhilHealth', detail.phic], ['Pag-IBIG', detail.hdmf],
            ['Gross Pay Net', detail.gross_pay_net], ['SSS Loan', detail.sss_loan], ['HDMF Loan', detail.hdmf_loan],
            ['Cash Advance', detail.cash_advance], ['Adjustment', detail.adjustment],
          ].map(([k, v]) => (
            <div key={k as string}>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{k}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(v as number)}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '14px 18px', marginTop: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Net Pay</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#22c55e' }}>{fmt(detail.net_pay)}</div>
        </div>
        <div style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)' }}>
          Prepared By: {detail.prepared_by_name || '—'} · Checked By: {detail.checked_by_name || '—'} · Approved By: {detail.approved_by_name || '—'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
          <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/payroll')}>Back to List</button>
        </div>
      </div>
    </main>
  )
}
