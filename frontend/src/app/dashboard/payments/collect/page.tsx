'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import CollectForm from '../CollectForm'

function CollectPageInner() {
  const searchParams = useSearchParams()
  const kind = searchParams.get('kind') === 'utility' ? 'utility' : 'maintenance'
  const id = Number(searchParams.get('id'))
  const amount = searchParams.get('amount') ?? '0'
  const title = searchParams.get('title') ?? ''
  return <CollectForm kind={kind} id={id} amount={amount} title={title} />
}

export default function CollectPaymentPage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <CollectPageInner />
    </Suspense>
  )
}
