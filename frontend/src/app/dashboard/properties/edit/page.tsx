'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import PropertyForm from '../PropertyForm'

function EditPropertyInner() {
  const searchParams = useSearchParams()
  const id = Number(searchParams.get('id'))
  return <PropertyForm propertyId={id} />
}

export default function EditPropertyPage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <EditPropertyInner />
    </Suspense>
  )
}
