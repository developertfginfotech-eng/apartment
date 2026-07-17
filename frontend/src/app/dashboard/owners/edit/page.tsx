'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import OwnerForm from '../OwnerForm'

function EditOwnerInner() {
  const searchParams = useSearchParams()
  const id = Number(searchParams.get('id'))
  return <OwnerForm ownerId={id} />
}

export default function EditOwnerPage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <EditOwnerInner />
    </Suspense>
  )
}
