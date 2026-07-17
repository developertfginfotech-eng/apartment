'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import EmployeeForm from '../EmployeeForm'

function EditEmployeeInner() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') ?? ''
  return <EmployeeForm employeeId={id} />
}

export default function EditEmployeePage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <EditEmployeeInner />
    </Suspense>
  )
}
