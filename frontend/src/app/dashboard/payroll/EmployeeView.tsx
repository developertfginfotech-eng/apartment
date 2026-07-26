'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/date'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface Employee {
  id: number
  name: string
  date_of_employment: string
  employment_status: string
  payment_type_name: string
  mobile_number: string
  bank_name: string
  account_number: string
  SWIFT_BIC_code: string
  tincode: string
}

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
})

export default function EmployeeView({ employeeId }: { employeeId: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/employee/${employeeId}`, { headers: authHeaders() })
      if (!res.ok) throw new Error()
      setEmployee(await res.json())
    } catch { setError('Failed to load employee') }
    finally { setLoading(false) }
  }, [employeeId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }

  if (error || !employee) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: '#ef4444' }}>{error || 'Employee not found'}</div></main>
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Employee Details</h1>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/payroll')}>← Back to Payroll</button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 620 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {([
            ['Name', employee.name],
            ['Date of Employment', formatDate(employee.date_of_employment)],
            ['Employment Status', employee.employment_status],
            ['Payment Type', employee.payment_type_name],
            ['Mobile', employee.mobile_number],
            ['Bank Name', employee.bank_name],
            ['Account Number', employee.account_number],
            ['SWIFT/BIC Code', employee.SWIFT_BIC_code],
            ['TIN Code', employee.tincode],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{k}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{v || '—'}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
