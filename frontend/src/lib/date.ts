// Locale is pinned to 'en-US' (not the visitor's browser locale) so the
// month/day/year order stays fixed regardless of where the app is opened.
export function formatDate(value?: string | Date | null): string {
  if (!value) return '—'
  const d = value instanceof Date ? value : parseDateLike(value)
  if (!d || Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// Normalizes any stored date-like string (MM-DD-YYYY text, YYYY-MM-DD, or a
// native Date-parseable string) into the YYYY-MM-DD shape date inputs/pickers
// require — without this, a MM-DD-YYYY value fed straight into a date input
// renders as a nonsense date (e.g. "11-21-2024" read as year 11, day 21).
export function toDateInputValue(value?: string | Date | null): string {
  if (!value) return ''
  const d = value instanceof Date ? value : parseDateLike(value)
  if (!d || Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
}

function parseDateLike(v: string): Date | null {
  // Some varchar columns (e.g. payrolls.payment_date) store MM-DD-YYYY text
  // rather than MySQL's native YYYY-MM-DD, so the format must be detected
  // explicitly rather than assumed by slicing — otherwise "12-31-2025" gets
  // misread as year=12/month=31/day=2025 and lands ~a century off.
  const mdy = v.match(/^(\d{2})-(\d{2})-(\d{4})/)
  if (mdy) {
    const [, m, d, y] = mdy.map(Number)
    return new Date(y, m - 1, d)
  }
  const ymd = v.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (ymd) {
    const [, y, m, d] = ymd.map(Number)
    return new Date(y, m - 1, d)
  }
  const parsed = new Date(v)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
