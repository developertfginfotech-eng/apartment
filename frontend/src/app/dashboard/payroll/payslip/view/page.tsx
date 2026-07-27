'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import PayslipView from '../../PayslipView'

function ViewPayslipInner() {
  const searchParams = useSearchParams()
  const id = Number(searchParams.get('id'))
  return <PayslipView payrollId={id} />
}

export default function ViewPayslipPage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <ViewPayslipInner />
    </Suspense>
  )
}
