'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import NoticeForm from '../NoticeForm'

function EditNoticeInner() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') ?? ''
  return <NoticeForm noticeId={id} />
}

export default function EditNoticePage() {
  return (
    <Suspense fallback={<main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>}>
      <EditNoticeInner />
    </Suspense>
  )
}
