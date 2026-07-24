'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import PropertyView from '../PropertyView'

function ViewPropertyInner() {
  const searchParams = useSearchParams()
  const id = Number(searchParams.get('id'))
  return <PropertyView propertyId={id} />
}

export default function ViewPropertyPage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <ViewPropertyInner />
    </Suspense>
  )
}
