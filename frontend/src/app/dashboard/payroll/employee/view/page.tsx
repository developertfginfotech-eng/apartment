'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import EmployeeView from '../../EmployeeView'

function ViewEmployeeInner() {
  const searchParams = useSearchParams()
  const id = Number(searchParams.get('id'))
  return <EmployeeView employeeId={id} />
}

export default function ViewEmployeePage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <ViewEmployeeInner />
    </Suspense>
  )
}
