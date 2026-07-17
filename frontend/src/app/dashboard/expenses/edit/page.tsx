'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ExpenseForm from '../ExpenseForm'

function EditExpenseInner() {
  const searchParams = useSearchParams()
  const id = Number(searchParams.get('id'))
  return <ExpenseForm expenseId={id} />
}

export default function EditExpensePage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <EditExpenseInner />
    </Suspense>
  )
}
