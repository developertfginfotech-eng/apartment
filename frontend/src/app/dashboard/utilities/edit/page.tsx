'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import UtilityForm from '../UtilityForm'

function EditUtilityInner() {
  const searchParams = useSearchParams()
  const id = Number(searchParams.get('id'))
  return <UtilityForm utilityId={id} />
}

export default function EditUtilityPage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <EditUtilityInner />
    </Suspense>
  )
}
