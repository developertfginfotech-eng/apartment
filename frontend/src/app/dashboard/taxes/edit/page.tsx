'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import TaxForm from '../TaxForm'

function EditTaxInner() {
  const searchParams = useSearchParams()
  const id = Number(searchParams.get('id'))
  return <TaxForm taxId={id} />
}

export default function EditTaxPage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <EditTaxInner />
    </Suspense>
  )
}
