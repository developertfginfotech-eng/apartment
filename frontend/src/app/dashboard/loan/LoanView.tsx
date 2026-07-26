'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/date'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Loan {
  id: number
  employee_name: string
  amount_of_loan: string | number
  loan_from_company: 'EPERC' | 'PHIC' | 'SSS' | 'HDMF' | 'BANK'
  date_of_the_loan: string
  name_of_bank: string | null
  interest_of_bank: string | number | null
  status: number
  payment_date: string
  payment_status: 'pending' | 'paid'
  payment_type: string
  receipt_image: string | null
}

export default function LoanView({ loanId }: { loanId: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [loan, setLoan] = useState<Loan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/loan/${loanId}`, { headers: authHeaders() })
      const data = await res.json()
      setLoan(data)
    } catch { setError('Failed to load loan') }
    finally { setLoading(false) }
  }, [loanId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const fmt = (v: string | number | null) => `₱ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }

  if (error || !loan) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: '#ef4444' }}>{error || 'Loan not found'}</div></main>
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Loan Details</h1>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/loan')}>← Back to Loans</button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 620 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {([
            ['Employee', loan.employee_name || '—'],
            ['Amount of Loan', fmt(loan.amount_of_loan)],
            ['Loan From Company', loan.loan_from_company],
            ['Date of the Loan', formatDate(loan.date_of_the_loan)],
            ['Payment Date', formatDate(loan.payment_date)],
            ['Payment Type', loan.payment_type || '—'],
            ['Payment Status', loan.payment_status],
            ['Status', loan.status === 1 ? 'Active' : 'Inactive'],
            ...(loan.loan_from_company === 'BANK' ? [['Name of Bank', loan.name_of_bank || '—'], ['Interest of Bank', loan.interest_of_bank ? `${loan.interest_of_bank}%` : '—']] : []),
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
            </div>
          ))}
        </div>
        {loan.receipt_image && (
          <a href={`${API}${loan.receipt_image}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--accent)' }}>View Receipt Image</a>
        )}
      </div>
    </main>
  )
}
