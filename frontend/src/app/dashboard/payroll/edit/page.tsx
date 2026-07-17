'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import PayrollForm from '../PayrollForm'

function EditPayrollInner() {
  const searchParams = useSearchParams()
  const id = Number(searchParams.get('id'))
  return <PayrollForm payrollId={id} />
}

export default function EditPayrollPage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <EditPayrollInner />
    </Suspense>
  )
}
