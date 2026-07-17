'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import MaintenanceForm from '../MaintenanceForm'

function EditMaintenanceInner() {
  const searchParams = useSearchParams()
  const id = Number(searchParams.get('id'))
  return <MaintenanceForm maintenanceId={id} />
}

export default function EditMaintenancePage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <EditMaintenanceInner />
    </Suspense>
  )
}
