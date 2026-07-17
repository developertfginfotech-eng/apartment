'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import LoanForm from '../LoanForm'

function EditLoanInner() {
  const searchParams = useSearchParams()
  const id = Number(searchParams.get('id'))
  return <LoanForm loanId={id} />
}

export default function EditLoanPage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <EditLoanInner />
    </Suspense>
  )
}
