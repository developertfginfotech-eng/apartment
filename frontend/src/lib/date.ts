export function formatDate(value?: string | Date | null): string {
  if (!value) return '—'
  const d = value instanceof Date ? value : parseDateLike(value)
  if (!d || Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function parseDateLike(v: string): Date | null {
  const ymd = v.slice(0, 10)
  const [y, m, d] = ymd.split('-').map(Number)
  if (y && m && d) return new Date(y, m - 1, d)
  const parsed = new Date(v)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
