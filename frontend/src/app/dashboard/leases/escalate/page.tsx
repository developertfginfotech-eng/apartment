'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import EscalationForm from '../EscalationForm'

function EscalateLeaseInner() {
  const searchParams = useSearchParams()
  const id = Number(searchParams.get('id'))
  return <EscalationForm leaseId={id} />
}

export default function EscalateLeasePage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <EscalateLeaseInner />
    </Suspense>
  )
}
