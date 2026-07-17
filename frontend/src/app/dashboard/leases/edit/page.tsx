'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import LeaseForm from '../LeaseForm'

function EditLeaseInner() {
  const searchParams = useSearchParams()
  const id = Number(searchParams.get('id'))
  return <LeaseForm leaseId={id} />
}

export default function EditLeasePage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <EditLeaseInner />
    </Suspense>
  )
}
