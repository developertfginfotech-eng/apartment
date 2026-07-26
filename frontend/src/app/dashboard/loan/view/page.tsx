'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import LoanView from '../LoanView'

function ViewLoanInner() {
  const searchParams = useSearchParams()
  const id = Number(searchParams.get('id'))
  return <LoanView loanId={id} />
}

export default function ViewLoanPage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <ViewLoanInner />
    </Suspense>
  )
}
