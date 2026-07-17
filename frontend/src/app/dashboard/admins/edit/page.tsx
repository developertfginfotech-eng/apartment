'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AdminForm from '../AdminForm'

function EditAdminInner() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') ?? ''
  return <AdminForm adminId={id} />
}

export default function EditAdminPage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <EditAdminInner />
    </Suspense>
  )
}
