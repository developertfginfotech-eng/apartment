'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import SecurityMoneyForm from '../SecurityMoneyForm'

function NewSecurityMoneyInner() {
  const searchParams = useSearchParams()
  const leaseId = Number(searchParams.get('lease_id'))
  return (
    <SecurityMoneyForm
      leaseId={leaseId}
      renterName={searchParams.get('renter_name') ?? undefined}
      propertyName={searchParams.get('property_name') ?? undefined}
      rentDeposit={searchParams.get('rent_deposit') ?? undefined}
    />
  )
}

export default function NewSecurityMoneyPage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <NewSecurityMoneyInner />
    </Suspense>
  )
}
