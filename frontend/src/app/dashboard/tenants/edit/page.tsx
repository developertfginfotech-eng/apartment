'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import TenantForm from '../TenantForm'

function EditTenantInner() {
  const searchParams = useSearchParams()
  const id = Number(searchParams.get('id'))
  return <TenantForm renterId={id} />
}

export default function EditTenantPage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <EditTenantInner />
    </Suspense>
  )
}
