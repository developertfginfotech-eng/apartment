'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import OwnerView from '../OwnerView'

function ViewOwnerInner() {
  const searchParams = useSearchParams()
  const id = Number(searchParams.get('id'))
  return <OwnerView ownerId={id} />
}

export default function ViewOwnerPage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <ViewOwnerInner />
    </Suspense>
  )
}
