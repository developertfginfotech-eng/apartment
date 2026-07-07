'use client'

import { useMemo, useState } from 'react'

interface PaginationProps {
  page: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
}

export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  )
  return { page: safePage, setPage, pageSize, pageCount, pageItems, totalItems: items.length }
}

export default function Pagination({ page, pageSize, totalItems, onPageChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize))
  if (totalItems === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)

  const pages: number[] = []
  const windowSize = 2
  for (let p = Math.max(1, page - windowSize); p <= Math.min(pageCount, page + windowSize); p++) pages.push(p)

  const btnStyle = (active: boolean, disabled = false): React.CSSProperties => ({
    minWidth: 32, height: 32, padding: '0 8px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border2)'),
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : disabled ? 'var(--muted)' : 'var(--text)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    fontFamily: 'inherit',
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
      <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
        Showing {from} to {to} of {totalItems} entries
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={btnStyle(false, page === 1)} disabled={page === 1} onClick={() => onPageChange(page - 1)}>‹</button>
        {pages[0] > 1 && <span style={{ padding: '0 4px', color: 'var(--muted)', fontSize: 13 }}>…</span>}
        {pages.map(p => (
          <button key={p} style={btnStyle(p === page)} onClick={() => onPageChange(p)}>{p}</button>
        ))}
        {pages[pages.length - 1] < pageCount && <span style={{ padding: '0 4px', color: 'var(--muted)', fontSize: 13 }}>…</span>}
        <button style={btnStyle(false, page === pageCount)} disabled={page === pageCount} onClick={() => onPageChange(page + 1)}>›</button>
      </div>
    </div>
  )
}
