'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import DatePicker from '@/components/DatePicker'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface UtilityBill {
  id: number
  renter_name: string | null
  property_name: string | null
  floor_name: string | null
  unit_name: string | null
  month: string | null
  water_bill: string | number
  water_bill_due_from: string | null
  water_bill_due_to: string | null
  electric_bill: string | number
  electric_bill_due_from: string | null
  electric_bill_due_to: string | null
  gas_bill: string | number
  security_bill: string | number
  cusa: string | number
  other_bill: string | number
  total_rent: string | number
  interest: string | number | null
  issue_date: string | null
  payment_type: string | null
  payment_mode: string | null
  payment_status: number
}

const EMPTY_FORM = {
  renter_id: '', property_id: '', month: '',
  water_bill: '', water_bill_due_from: '', water_bill_due_to: '',
  electric_bill: '', electric_bill_due_from: '', electric_bill_due_to: '',
  gas_bill: '', security_bill: '', cusa: '', other_bill: '', interest: '', issue_date: '',
}

export default function UtilityForm({ utilityId }: { utilityId?: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [renters, setRenters] = useState<{ id: number; name: string }[]>([])
  const [properties, setProperties] = useState<{ id: number; property_name: string }[]>([])

  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(!!utilityId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  useEffect(() => {
    fetch(`${API}/renters`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setRenters(d)).catch(() => {})
    fetch(`${API}/properties`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setProperties(d)).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadBill = useCallback(async (id: number) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/utility`, { headers: authHeaders() })
      const list: UtilityBill[] = await res.json()
      const b = Array.isArray(list) ? list.find(x => x.id === id) : null
      if (!b) { setError('Utility bill not found'); return }
      setForm({
        renter_id: '', property_id: '', month: b.month ?? '',
        water_bill: String(b.water_bill ?? 0), water_bill_due_from: b.water_bill_due_from ?? '', water_bill_due_to: b.water_bill_due_to ?? '',
        electric_bill: String(b.electric_bill ?? 0), electric_bill_due_from: b.electric_bill_due_from ?? '', electric_bill_due_to: b.electric_bill_due_to ?? '',
        gas_bill: String(b.gas_bill ?? 0), security_bill: String(b.security_bill ?? 0),
        cusa: String(b.cusa ?? 0), other_bill: String(b.other_bill ?? 0), interest: b.interest != null ? String(b.interest) : '',
        issue_date: b.issue_date ?? '',
      })
    } catch { setError('Failed to load utility bill') }
    finally { setLoading(false) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!utilityId) return
    loadBill(utilityId)
  }, [utilityId, loadBill])

  const sf = (v: string, k: keyof typeof EMPTY_FORM) => setForm(f => ({ ...f, [k]: v }))

  const fmt = (v: string | number) => `₱ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const total = (Number(form.water_bill) || 0) + (Number(form.electric_bill) || 0) + (Number(form.gas_bill) || 0) + (Number(form.security_bill) || 0) + (Number(form.cusa) || 0) + (Number(form.other_bill) || 0)

  const save = async () => {
    if (!form.property_id) return
    setSaving(true); setError('')
    const body = {
      renter_id: form.renter_id ? parseInt(form.renter_id, 10) : null,
      property_id: parseInt(form.property_id, 10),
      month: form.month, issue_date: form.issue_date,
      water_bill: form.water_bill || 0, water_bill_due_from: form.water_bill_due_from || null, water_bill_due_to: form.water_bill_due_to || null,
      electric_bill: form.electric_bill || 0, electric_bill_due_from: form.electric_bill_due_from || null, electric_bill_due_to: form.electric_bill_due_to || null,
      gas_bill: form.gas_bill || 0, security_bill: form.security_bill || 0,
      cusa: form.cusa || 0, other_bill: form.other_bill || 0, interest: form.interest || 0,
      total_rent: total,
    }
    try {
      if (utilityId) {
        await fetch(`${API}/utility/${utilityId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) })
      } else {
        await fetch(`${API}/utility`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) })
      }
      router.push('/dashboard/utilities')
    } catch { setError(utilityId ? 'Failed to update utility bill' : 'Failed to save utility bill') }
    finally { setSaving(false) }
  }

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>{utilityId ? 'Edit Utility Bill' : 'Add Utility Bill'}</h1>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/utilities')}>← Back to Utility Bills</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 820 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="af-field">
            <label>Renter</label>
            <select className="af-select" value={form.renter_id} onChange={e => sf(e.target.value, 'renter_id')}>
              <option value="">-- Select Renter --</option>
              {renters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="af-field">
            <label>Property</label>
            <select className="af-select" value={form.property_id} onChange={e => sf(e.target.value, 'property_id')}>
              <option value="">-- Select Property --</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.property_name}</option>)}
            </select>
          </div>
          <div className="af-field"><label>Month</label><input value={form.month} onChange={e => sf(e.target.value, 'month')} placeholder="June" /></div>
          <div className="af-field"><label>Issue Date</label><DatePicker value={form.issue_date} onChange={v => sf(v, 'issue_date')} /></div>
          <div className="af-field"><label>Water Bill</label><input type="number" min="0" value={form.water_bill} onChange={e => sf(e.target.value, 'water_bill')} placeholder="0" /></div>
          <div className="af-field"><label>Water Bill Due From</label><DatePicker value={form.water_bill_due_from} onChange={v => sf(v, 'water_bill_due_from')} /></div>
          <div className="af-field"><label>Water Bill Due To</label><DatePicker value={form.water_bill_due_to} onChange={v => sf(v, 'water_bill_due_to')} /></div>
          <div className="af-field"><label>Electric Bill</label><input type="number" min="0" value={form.electric_bill} onChange={e => sf(e.target.value, 'electric_bill')} placeholder="0" /></div>
          <div className="af-field"><label>Electric Bill Due From</label><DatePicker value={form.electric_bill_due_from} onChange={v => sf(v, 'electric_bill_due_from')} /></div>
          <div className="af-field"><label>Electric Bill Due To</label><DatePicker value={form.electric_bill_due_to} onChange={v => sf(v, 'electric_bill_due_to')} /></div>
          <div className="af-field"><label>Gas Bill</label><input type="number" min="0" value={form.gas_bill} onChange={e => sf(e.target.value, 'gas_bill')} placeholder="0" /></div>
          <div className="af-field"><label>Security Bill</label><input type="number" min="0" value={form.security_bill} onChange={e => sf(e.target.value, 'security_bill')} placeholder="0" /></div>
          <div className="af-field"><label>Cusa</label><input type="number" min="0" value={form.cusa} onChange={e => sf(e.target.value, 'cusa')} placeholder="0" /></div>
          <div className="af-field"><label>Other Bill</label><input type="number" min="0" value={form.other_bill} onChange={e => sf(e.target.value, 'other_bill')} placeholder="0" /></div>
          <div className="af-field"><label>Interest</label><input type="number" min="0" value={form.interest} onChange={e => sf(e.target.value, 'interest')} placeholder="0" /></div>
        </div>
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
          Total: <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--accent)' }}>{fmt(total)}</span>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/utilities')} disabled={saving}>Cancel</button>
          <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : utilityId ? 'Save Changes' : 'Add Bill'}
          </button>
        </div>
      </div>
    </main>
  )
}
