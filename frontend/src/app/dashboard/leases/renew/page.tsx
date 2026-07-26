'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import RenewForm from '../RenewForm'

function RenewLeaseInner() {
  const searchParams = useSearchParams()
  const id = Number(searchParams.get('id'))
  return <RenewForm leaseId={id} />
}

export default function RenewLeasePage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <RenewLeaseInner />
    </Suspense>
  )
}
