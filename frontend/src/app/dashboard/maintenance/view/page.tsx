'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import MaintenanceView from '../MaintenanceView'

function ViewMaintenanceInner() {
  const searchParams = useSearchParams()
  const id = Number(searchParams.get('id'))
  return <MaintenanceView maintenanceId={id} />
}

export default function ViewMaintenancePage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <ViewMaintenanceInner />
    </Suspense>
  )
}
