'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import VendorForm from '../VendorForm'

function EditVendorInner() {
  const searchParams = useSearchParams()
  const id = Number(searchParams.get('id'))
  return <VendorForm vendorId={id} />
}

export default function EditVendorPage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <EditVendorInner />
    </Suspense>
  )
}
