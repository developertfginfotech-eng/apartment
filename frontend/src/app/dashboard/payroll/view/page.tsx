'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import PayrollView from '../PayrollView'

function ViewPayrollInner() {
  const searchParams = useSearchParams()
  const id = Number(searchParams.get('id'))
  return <PayrollView payrollId={id} />
}

export default function ViewPayrollPage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <ViewPayrollInner />
    </Suspense>
  )
}
