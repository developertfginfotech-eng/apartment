'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DatePicker from '@/components/DatePicker'
import { computeFinalAmount } from '@/lib/leaseCalc'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface LeaseFull {
  id: number
  renter_name: string
  property_name: string | null
  floor_name: string | null
  unit_ids: number[]
  amount: string | null
  maintenance: string | null
  tax: string | null
  wtax_applicable: string | null
  wtax: string | null
}

export default function EscalationForm({ leaseId }: { leaseId: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [lease, setLease] = useState<LeaseFull | null>(null)
  const [taxes, setTaxes] = useState<{ id: number; key: string; value: string }[]>([])
  const [wtaxes, setWtaxes] = useState<{ id: number; key: string; value: string }[]>([])
  const [form, setForm] = useState({ amount: '', maintenance: '', tax: '', wtax_applicable: false, wtax: '', end_date: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  useEffect(() => {
    fetch(`${API}/tax`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setTaxes(d)).catch(() => {})
    fetch(`${API}/wtax`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setWtaxes(d)).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    (async () => {
      setLoading(true); setError('')
      try {
        const res = await fetch(`${API}/leases/${leaseId}/full`, { headers: authHeaders() })
        const full: LeaseFull = await res.json()
        setLease(full)
        setForm({
          amount: full.amount ?? '',
          maintenance: full.maintenance ?? '',
          tax: full.tax ?? '',
          wtax_applicable: full.wtax_applicable === 'on',
          wtax: full.wtax ?? '',
          end_date: '',
        })
      } catch { setError('Failed to load lease') }
      finally { setLoading(false) }
    })()
  }, [leaseId])

  const finalAmount = computeFinalAmount({
    amount: form.amount, maintenance: form.maintenance, tax: form.tax,
    wtaxApplicable: form.wtax_applicable, wtax: form.wtax,
  })

  const save = async () => {
    if (!form.amount || !form.end_date) return
    setSaving(true); setError('')
    try {
      const res = await fetch(`${API}/leases/${leaseId}/escalate`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          amount: form.amount,
          maintenance: form.maintenance || '0',
          tax: form.tax || null,
          wtax_applicable: form.wtax_applicable ? 'on' : '',
          wtax: form.wtax_applicable ? form.wtax : null,
          rent_amount: finalAmount,
          end_date: form.end_date,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || 'Failed to escalate lease')
      }
      router.push('/dashboard/leases')
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to escalate lease') }
    finally { setSaving(false) }
  }

  if (loading || !lease) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Lease Rent Escalation</h1>
          <p className="af-db-subtitle">{lease.renter_name?.trim()}</p>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/leases')}>← Back to Leases</button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 720 }}>
        <div className="af-modal-form">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="af-field"><label>Renter</label><input value={lease.renter_name?.trim() ?? ''} disabled/></div>
            <div className="af-field"><label>Property</label><input value={lease.property_name ?? ''} disabled/></div>
            <div className="af-field"><label>Floor</label><input value={lease.floor_name ?? ''} disabled/></div>
            <div className="af-field"><label>Unit(s)</label><input value={lease.unit_ids?.join(', ') ?? ''} disabled/></div>
            <div className="af-field"><label>Rent Amount</label><input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}/></div>
            <div className="af-field"><label>Maintenance</label><input type="number" min="0" step="0.01" value={form.maintenance} onChange={e => setForm(f => ({ ...f, maintenance: e.target.value }))}/></div>
            <div className="af-field">
              <label>VAT (%)</label>
              <select className="af-select" value={form.tax} onChange={e => setForm(f => ({ ...f, tax: e.target.value }))}>
                <option value="">-- Select VAT --</option>
                {taxes.map(t => <option key={t.id} value={t.value}>{t.key} ({t.value}%)</option>)}
              </select>
            </div>
            <div className="af-field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={form.wtax_applicable} onChange={e => setForm(f => ({ ...f, wtax_applicable: e.target.checked }))} />
                Wtax Applicable
              </label>
              {form.wtax_applicable && (
                <select className="af-select" value={form.wtax} onChange={e => setForm(f => ({ ...f, wtax: e.target.value }))}>
                  <option value="">-- Select WTAX --</option>
                  {wtaxes.map(w => <option key={w.id} value={w.value}>{w.key} ({w.value}%)</option>)}
                </select>
              )}
            </div>
            <div className="af-field"><label>Final Amount</label><input readOnly value={finalAmount} style={{ opacity: 0.75 }}/></div>
            <div className="af-field"><label>When to start</label><DatePicker value={form.end_date} onChange={v => setForm(f => ({ ...f, end_date: v }))}/></div>
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 10 }}>{error}</div>}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/leases')} disabled={saving}>Cancel</button>
          <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Escalate'}
          </button>
        </div>
      </div>
    </main>
  )
}
