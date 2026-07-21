'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import RenterView from '../RenterView'

function ViewRenterInner() {
  const searchParams = useSearchParams()
  const id = Number(searchParams.get('id'))
  return <RenterView renterId={id} />
}

export default function ViewRenterPage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <ViewRenterInner />
    </Suspense>
  )
}
