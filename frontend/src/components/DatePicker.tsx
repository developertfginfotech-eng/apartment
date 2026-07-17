'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface DatePickerProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  style?: React.CSSProperties
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function parseYMD(v: string): Date | null {
  if (!v) return null
  const [y, m, d] = v.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDisplay(v: string): string {
  const d = parseYMD(v)
  if (!d) return ''
  // Pinned to 'en-US' so month/day/year order stays fixed regardless of browser locale.
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function DatePicker({ value, onChange, placeholder = 'Select date', style }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [mounted, setMounted] = useState(false)
  const selected = parseYMD(value)
  const today = new Date()
  const [cursor, setCursor] = useState(() => selected ?? today)
  const rootRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (selected) setCursor(selected)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const updatePos = () => {
      const r = rootRef.current?.getBoundingClientRect()
      if (r) setPos({ top: r.bottom + 6, left: r.left })
    }
    updatePos()
    const onDocClick = (e: MouseEvent) => {
      if (
        rootRef.current && !rootRef.current.contains(e.target as Node) &&
        popRef.current && !popRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells: { day: number; inMonth: boolean; date: Date }[] = []
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, inMonth: false, date: new Date(year, month - 1, daysInPrevMonth - i) })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, date: new Date(year, month, d) })
  }
  const trailing = (7 - (cells.length % 7)) % 7
  for (let d = 1; d <= trailing; d++) {
    cells.push({ day: d, inMonth: false, date: new Date(year, month + 1, d) })
  }

  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  const pick = (d: Date) => { onChange(toYMD(d)); setOpen(false) }
  const goMonth = (delta: number) => setCursor(new Date(year, month + delta, 1))

  const panel = open && (
    <div ref={popRef} className="af-datepicker-pop af-modal-in" style={{ position: 'fixed', top: pos.top, left: pos.left }}>
      <div className="af-datepicker-header">
        <button type="button" className="af-datepicker-nav" onClick={() => goMonth(-1)}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 13.5 }}>{MONTH_NAMES[month]} {year}</span>
        <button type="button" className="af-datepicker-nav" onClick={() => goMonth(1)}>›</button>
      </div>
      <div className="af-datepicker-grid af-datepicker-weekdays">
        {WEEKDAYS.map(w => <span key={w}>{w}</span>)}
      </div>
      <div className="af-datepicker-grid">
        {cells.map((c, i) => {
          const isSelected = selected && isSameDay(c.date, selected)
          const isToday = isSameDay(c.date, today)
          return (
            <button
              type="button"
              key={i}
              onClick={() => pick(c.date)}
              className={`af-datepicker-day ${isSelected ? 'selected' : ''} ${isToday && !isSelected ? 'today' : ''} ${!c.inMonth ? 'muted' : ''}`}
            >
              {c.day}
            </button>
          )
        })}
      </div>
      <div className="af-datepicker-footer">
        <button type="button" className="af-datepicker-link" onClick={() => { onChange(''); setOpen(false) }}>Clear</button>
        <button type="button" className="af-datepicker-link" onClick={() => pick(today)}>Today</button>
      </div>
    </div>
  )

  return (
    <div ref={rootRef} style={{ position: 'relative', ...style }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="af-datepicker-trigger"
      >
        <span style={{ color: value ? 'var(--text)' : 'var(--muted)' }}>{value ? formatDisplay(value) : placeholder}</span>
        <span aria-hidden style={{ fontSize: 14, opacity: 0.7 }}>📅</span>
      </button>

      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  )
}
