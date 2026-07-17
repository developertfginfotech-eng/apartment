'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import LeaseView from '../LeaseView'

function ViewLeaseInner() {
  const searchParams = useSearchParams()
  const id = Number(searchParams.get('id'))
  return <LeaseView leaseId={id} />
}

export default function ViewLeasePage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <ViewLeaseInner />
    </Suspense>
  )
}
