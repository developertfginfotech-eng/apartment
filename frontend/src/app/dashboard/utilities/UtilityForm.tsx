'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import DatePicker from '@/components/DatePicker'
import FileDropInput from '@/components/FileDropInput'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const PAYMENT_MODES = ['Cash', 'Cheque', 'PDC Cheque', 'Online']

const EMPTY_FORM = {
  property_id: '', floor_id: '', unit_id: '', renter_id: '', renter_name: '',
  month: '',
  water_bill: '', water_bill_due_from: '', water_bill_due_to: '',
  electric_bill: '', electric_bill_due_from: '', electric_bill_due_to: '',
  cusa: '', cusa_due: '',
  utility_bill: '', utility_bill_due: '',
  other_bill: '', other_bill_due: '',
  interest: '', issue_date: '',
  payment_mode: '',
  cheque_details: '', pdc_cheque_details: '', pdc_cheque_date: '', online_details: '',
}

const EMPTY_FILES: Record<string, File | null> = {
  water_bill_doc: null, electric_bill_doc: null, cusa_doc: null, utility_bill_doc: null, other_bill_doc: null,
  cheque_image: null, pdc_cheque_image: null, online_image: null,
}

export default function UtilityForm({ utilityId }: { utilityId?: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [properties, setProperties] = useState<{ id: number; property_name: string }[]>([])
  const [floors, setFloors] = useState<{ id: number; name: string }[]>([])
  const [units, setUnits] = useState<{ id: number; name: string }[]>([])

  const [form, setForm] = useState(EMPTY_FORM)
  const [existingDocs, setExistingDocs] = useState<Record<string, string>>({})
  const [files, setFiles] = useState(EMPTY_FILES)
  const [loading, setLoading] = useState(!!utilityId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  useEffect(() => {
    fetch(`${API}/properties`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setProperties(d)).catch(() => {})
    if (!utilityId) setForm(f => ({ ...f, issue_date: new Date().toISOString().slice(0, 10) }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFloors = useCallback(async (propertyId: string) => {
    if (!propertyId) { setFloors([]); return }
    const res = await fetch(`${API}/property-floor?property_id=${propertyId}`, { headers: authHeaders() })
    const d = await res.json()
    setFloors(Array.isArray(d) ? d : [])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUnits = useCallback(async (propertyId: string, floorId: string) => {
    if (!propertyId || !floorId) { setUnits([]); return }
    const res = await fetch(`${API}/property-unit?property_id=${propertyId}&floor_id=${floorId}`, { headers: authHeaders() })
    const d = await res.json()
    setUnits(Array.isArray(d) ? d : [])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!utilityId) return
    (async () => {
      setLoading(true); setError('')
      try {
        const res = await fetch(`${API}/utility/${utilityId}`, { headers: authHeaders() })
        const b = await res.json()
        if (!b) { setError('Utility bill not found'); return }
        await fetchFloors(String(b.property_id ?? ''))
        await fetchUnits(String(b.property_id ?? ''), String(b.floor_id ?? ''))
        setForm({
          property_id: b.property_id != null ? String(b.property_id) : '',
          floor_id: b.floor_id != null ? String(b.floor_id) : '',
          unit_id: b.unit_id != null ? String(b.unit_id) : '',
          renter_id: b.renter_id != null ? String(b.renter_id) : '',
          renter_name: b.renter_name ?? '',
          month: b.month ?? '',
          water_bill: String(b.water_bill ?? 0), water_bill_due_from: b.water_bill_due_from ?? '', water_bill_due_to: b.water_bill_due_to ?? '',
          electric_bill: String(b.electric_bill ?? 0), electric_bill_due_from: b.electric_bill_due_from ?? '', electric_bill_due_to: b.electric_bill_due_to ?? '',
          cusa: String(b.cusa ?? 0), cusa_due: b.cusa_due ?? '',
          utility_bill: String(b.utility_bill ?? 0), utility_bill_due: b.utility_bill_due ?? '',
          other_bill: String(b.other_bill ?? 0), other_bill_due: b.other_bill_due ?? '',
          interest: b.interest != null ? String(b.interest) : '', issue_date: b.issue_date ?? '',
          payment_mode: b.payment_mode ?? '',
          cheque_details: b.cheque_details ?? '', pdc_cheque_details: b.pdc_cheque_details ?? '', pdc_cheque_date: b.pdc_cheque_date ?? '',
          online_details: b.online_details ?? '',
        })
        setExistingDocs({
          water_bill_doc: b.water_bill_doc ?? '', electric_bill_doc: b.electric_bill_doc ?? '', cusa_doc: b.cusa_doc ?? '',
          utility_bill_doc: b.utility_bill_doc ?? '', other_bill_doc: b.other_bill_doc ?? '',
          cheque_image: b.cheque_image ?? '', pdc_cheque_image: b.pdc_cheque_image ?? '', online_image: b.online_image ?? '',
        })
      } catch { setError('Failed to load utility bill') }
      finally { setLoading(false) }
    })()
  }, [utilityId, fetchFloors, fetchUnits])

  const sf = (v: string, k: keyof typeof EMPTY_FORM) => setForm(f => ({ ...f, [k]: v }))

  const onPropertyChange = (propertyId: string) => {
    setForm(f => ({ ...f, property_id: propertyId, floor_id: '', unit_id: '', renter_id: '', renter_name: '' }))
    setUnits([])
    fetchFloors(propertyId)
  }

  const onFloorChange = (floorId: string) => {
    setForm(f => ({ ...f, floor_id: floorId, unit_id: '', renter_id: '', renter_name: '' }))
    fetchUnits(form.property_id, floorId)
  }

  const onUnitChange = async (unitId: string) => {
    setForm(f => ({ ...f, unit_id: unitId, renter_id: '', renter_name: '' }))
    if (!unitId) return
    try {
      const res = await fetch(`${API}/utility/renter-by-unit/${unitId}`, { headers: authHeaders() })
      const r = await res.json()
      if (r) setForm(f => ({ ...f, renter_id: r.renter_id != null ? String(r.renter_id) : '', renter_name: r.renter_name ?? '' }))
    } catch { /* no active lease for this unit */ }
  }

  const fmt = (v: string | number) => `₱ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const total = (Number(form.water_bill) || 0) + (Number(form.electric_bill) || 0) + (Number(form.cusa) || 0) + (Number(form.utility_bill) || 0) + (Number(form.other_bill) || 0)

  const uploadFile = async (file: File): Promise<string | null> => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${API}/document/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('apt_token')}` },
      body: fd,
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.url ?? null
  }

  const save = async () => {
    if (!form.property_id || !form.floor_id || !form.unit_id) return
    setSaving(true); setError('')
    try {
      const body: Record<string, unknown> = {
        property_id: parseInt(form.property_id, 10),
        floor_id: parseInt(form.floor_id, 10),
        unit_id: parseInt(form.unit_id, 10),
        renter_id: form.renter_id ? parseInt(form.renter_id, 10) : null,
        month: form.month,
        water_bill: form.water_bill || 0, water_bill_due_from: form.water_bill_due_from || null, water_bill_due_to: form.water_bill_due_to || null,
        electric_bill: form.electric_bill || 0, electric_bill_due_from: form.electric_bill_due_from || null, electric_bill_due_to: form.electric_bill_due_to || null,
        cusa: form.cusa || 0, cusa_due: form.cusa_due || null,
        utility_bill: form.utility_bill || 0, utility_bill_due: form.utility_bill_due || null,
        other_bill: form.other_bill || 0, other_bill_due: form.other_bill_due || null,
        total_rent: total, interest: form.interest || 0, issue_date: form.issue_date || null,
        payment_mode: form.payment_mode || null,
      }
      if (form.payment_mode === 'Cheque') {
        body.cheque_details = form.cheque_details
      } else if (form.payment_mode === 'PDC Cheque') {
        body.pdc_cheque_details = form.pdc_cheque_details
        body.pdc_cheque_date = form.pdc_cheque_date
      } else if (form.payment_mode === 'Online') {
        body.online_details = form.online_details
      }

      for (const key of Object.keys(files) as (keyof typeof files)[]) {
        const file = files[key]
        if (file) body[key] = await uploadFile(file)
      }

      const url = utilityId ? `${API}/utility/${utilityId}` : `${API}/utility`
      const method = utilityId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      router.push('/dashboard/utilities')
    } catch { setError(utilityId ? 'Failed to update utility bill' : 'Failed to save utility bill') }
    finally { setSaving(false) }
  }

  const del = async () => {
    if (!utilityId || !confirm('Delete this utility bill?')) return
    try {
      await fetch(`${API}/utility/${utilityId}`, { method: 'DELETE', headers: authHeaders() })
      router.push('/dashboard/utilities')
    } catch { setError('Failed to delete utility bill') }
  }

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }

  const billRow = (label: string, amountKey: 'water_bill' | 'electric_bill' | 'cusa' | 'utility_bill' | 'other_bill', docKey: keyof typeof files, dueFields: { key: string; label: string }[]) => (
    <div style={{ border: '1px solid var(--border2)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
      <div style={{ fontWeight: 650, fontSize: 13, marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: `1fr repeat(${dueFields.length}, 1fr) 1.4fr`, gap: 10, alignItems: 'end' }}>
        <div className="af-field">
          <label>{label}</label>
          <input type="number" min="0" value={form[amountKey]} onChange={e => sf(e.target.value, amountKey)} placeholder="0" />
        </div>
        {dueFields.map(d => (
          <div className="af-field" key={d.key}>
            <label>{d.label}</label>
            <DatePicker value={(form as Record<string, string>)[d.key]} onChange={v => sf(v, d.key as keyof typeof EMPTY_FORM)} />
          </div>
        ))}
        <div className="af-field">
          <label>Document</label>
          <FileDropInput
            accept="image/*,.pdf"
            value={files[docKey]}
            onChange={file => setFiles(f => ({ ...f, [docKey]: file }))}
            placeholder={existingDocs[docKey] ? 'Replace document' : 'Choose a document'}
          />
        </div>
      </div>
    </div>
  )

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>{utilityId ? 'Edit Utility Bill' : 'Add Utility Bill'}</h1>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/utilities')}>← Back to Utility Bills</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 980 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Basic Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 4 }}>
          <div className="af-field">
            <label>Property<span style={{ color: '#f87171' }}> *</span></label>
            <select className="af-select" value={form.property_id} onChange={e => onPropertyChange(e.target.value)}>
              <option value="">Select Property</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.property_name}</option>)}
            </select>
          </div>
          <div className="af-field">
            <label>Floor<span style={{ color: '#f87171' }}> *</span></label>
            <select className="af-select" value={form.floor_id} onChange={e => onFloorChange(e.target.value)} disabled={!form.property_id}>
              <option value="">Select Floor</option>
              {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="af-field">
            <label>Unit<span style={{ color: '#f87171' }}> *</span></label>
            <select className="af-select" value={form.unit_id} onChange={e => onUnitChange(e.target.value)} disabled={!form.floor_id}>
              <option value="">Select Unit</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="af-field">
            <label>Renter Name</label>
            <input value={form.renter_name} disabled placeholder="Auto-filled from unit's active lease" />
          </div>
          <div className="af-field">
            <label>Month</label>
            <select className="af-select" value={form.month} onChange={e => sf(e.target.value, 'month')}>
              <option value="">Select Month</option>
              {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
            </select>
          </div>
        </div>

        {billRow('Water Bill', 'water_bill', 'water_bill_doc', [{ key: 'water_bill_due_from', label: 'Due From' }, { key: 'water_bill_due_to', label: 'Due To' }])}
        {billRow('Electric Bill', 'electric_bill', 'electric_bill_doc', [{ key: 'electric_bill_due_from', label: 'Due From' }, { key: 'electric_bill_due_to', label: 'Due To' }])}
        {billRow('Cusa', 'cusa', 'cusa_doc', [{ key: 'cusa_due', label: 'Due Date' }])}
        {billRow('Utility Bill', 'utility_bill', 'utility_bill_doc', [{ key: 'utility_bill_due', label: 'Due Date' }])}
        {billRow('Other Bill', 'other_bill', 'other_bill_doc', [{ key: 'other_bill_due', label: 'Due Date' }])}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 4, marginBottom: 4, alignItems: 'end' }}>
          <div className="af-field">
            <label>Total Utility Rent</label>
            <input value={fmt(total)} readOnly disabled />
          </div>
          <div className="af-field">
            <label>Interest</label>
            <input type="number" min="0" value={form.interest} onChange={e => sf(e.target.value, 'interest')} placeholder="0" />
          </div>
          <div className="af-field">
            <label>Pay Date</label>
            <DatePicker value={form.issue_date} onChange={v => sf(v, 'issue_date')} />
          </div>
        </div>

        <div className="af-field" style={{ marginTop: 10, marginBottom: 4 }}>
          <label>Select Payment Mode</label>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
            {PAYMENT_MODES.map(pm => (
              <label key={pm} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="radio" name="utility_payment_mode" checked={form.payment_mode === pm} onChange={() => sf(pm, 'payment_mode')} />
                {pm}
              </label>
            ))}
          </div>
        </div>

        {form.payment_mode === 'Cheque' && (
          <div style={{ marginTop: 10, borderTop: '1px solid var(--border2)', paddingTop: 14 }}>
            <div className="af-field">
              <label>Cheque Details</label>
              <textarea rows={3} value={form.cheque_details} onChange={e => sf(e.target.value, 'cheque_details')} />
            </div>
            <div className="af-field">
              <label>Cheque Image</label>
              <FileDropInput accept="image/*,.pdf" value={files.cheque_image} onChange={file => setFiles(f => ({ ...f, cheque_image: file }))} placeholder={existingDocs.cheque_image ? 'Replace image' : 'Choose a document'} />
            </div>
          </div>
        )}
        {form.payment_mode === 'PDC Cheque' && (
          <div style={{ marginTop: 10, borderTop: '1px solid var(--border2)', paddingTop: 14 }}>
            <div className="af-field">
              <label>PDC Cheque Details</label>
              <textarea rows={3} value={form.pdc_cheque_details} onChange={e => sf(e.target.value, 'pdc_cheque_details')} />
            </div>
            <div className="af-field">
              <label>PDC Cheque Image</label>
              <FileDropInput accept="image/*,.pdf" value={files.pdc_cheque_image} onChange={file => setFiles(f => ({ ...f, pdc_cheque_image: file }))} placeholder={existingDocs.pdc_cheque_image ? 'Replace image' : 'Choose a document'} />
            </div>
            <div className="af-field">
              <label>PDC Cheque Date</label>
              <DatePicker value={form.pdc_cheque_date} onChange={v => sf(v, 'pdc_cheque_date')} />
            </div>
          </div>
        )}
        {form.payment_mode === 'Online' && (
          <div style={{ marginTop: 10, borderTop: '1px solid var(--border2)', paddingTop: 14 }}>
            <div className="af-field">
              <label>Online Details</label>
              <textarea rows={3} value={form.online_details} onChange={e => sf(e.target.value, 'online_details')} />
            </div>
            <div className="af-field">
              <label>Online Image</label>
              <FileDropInput accept="image/*,.pdf" value={files.online_image} onChange={file => setFiles(f => ({ ...f, online_image: file }))} placeholder={existingDocs.online_image ? 'Replace image' : 'Choose a document'} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'space-between' }}>
          {utilityId ? <button className="af-btn-secondary" style={{ cursor: 'pointer', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={del} disabled={saving}>Delete</button> : <div />}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/utilities')} disabled={saving}>Cancel</button>
            <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save} disabled={saving || !form.property_id || !form.floor_id || !form.unit_id}>
              {saving ? 'Saving…' : utilityId ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
