// Locale is pinned to 'en-US' (not the visitor's browser locale) so the
// month/day/year order stays fixed regardless of where the app is opened.
export function formatDate(value?: string | Date | null): string {
  if (!value) return '—'
  const d = value instanceof Date ? value : parseDateLike(value)
  if (!d || Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
}

function parseDateLike(v: string): Date | null {
  const ymd = v.slice(0, 10)
  const [y, m, d] = ymd.split('-').map(Number)
  if (y && m && d) return new Date(y, m - 1, d)
  const parsed = new Date(v)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
