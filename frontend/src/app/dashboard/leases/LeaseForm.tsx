'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import DatePicker from '@/components/DatePicker'
import { computeFinalAmount } from '@/lib/leaseCalc'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface LeaseFull {
  id: number
  renter_id: number
  property_id: number
  floor_id: string | null
  type: string | null
  amount: string | null
  maintenance: string | null
  tax: string | null
  wtax_applicable: string | null
  wtax: string | null
  rent_deposit: string | null
  start_date: string | null
  end_date: string | null
  due_on: string | null
  document_image: string | null
  unit_ids: number[]
  deposits: { id: number; utility_type: number; utility: string }[]
}

const EMPTY_LEASE_FORM = {
  renter_id: '', property_id: '', floor_id: '', unit_ids: [] as string[],
  type: 'Residential', amount: '', maintenance: '', tax: '', wtax_applicable: false, wtax: '',
  start_date: '', end_date: '', due_on: '1',
}
const EMPTY_DEPOSIT_FORM = { rent_deposit: '', deposits: [] as { utility_type: string; utility: string }[] }

const WIZARD_STEPS = ['Lease Info', 'Deposits'] as const
type WizardStep = typeof WIZARD_STEPS[number]

export default function LeaseForm({ leaseId }: { leaseId?: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [renters, setRenters] = useState<{ id: number; name: string }[]>([])
  const [properties, setProperties] = useState<{ id: number; property_name: string }[]>([])
  const [floors, setFloors] = useState<{ id: number; name: string }[]>([])
  const [units, setUnits] = useState<{ id: number; name: string }[]>([])
  const [taxes, setTaxes] = useState<{ id: number; key: string; value: string }[]>([])
  const [wtaxes, setWtaxes] = useState<{ id: number; key: string; value: string }[]>([])
  const [propertyUtilities, setPropertyUtilities] = useState<{ id: number; name: string; display_name: string }[]>([])

  const [wizardStep, setWizardStep] = useState<WizardStep>('Lease Info')
  const [leaseForm, setLeaseForm] = useState(EMPTY_LEASE_FORM)
  const [depositForm, setDepositForm] = useState(EMPTY_DEPOSIT_FORM)
  const [existingDocs, setExistingDocs] = useState<string[]>([])
  const [newDocs, setNewDocs] = useState<File[]>([])
  const [loading, setLoading] = useState(!!leaseId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  useEffect(() => {
    fetch(`${API}/renters`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setRenters(d)).catch(() => {})
    fetch(`${API}/properties`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setProperties(d)).catch(() => {})
    fetch(`${API}/tax`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setTaxes(d)).catch(() => {})
    fetch(`${API}/wtax`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setWtaxes(d)).catch(() => {})
    fetch(`${API}/property-utility`, { headers: authHeaders() }).then(r => r.json()).then(d => Array.isArray(d) && setPropertyUtilities(d)).catch(() => {})
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
    if (!leaseId) return
    (async () => {
      setLoading(true); setError('')
      try {
        const res = await fetch(`${API}/leases/${leaseId}/full`, { headers: authHeaders() })
        const full: LeaseFull = await res.json()
        setLeaseForm({
          renter_id: String(full.renter_id ?? ''),
          property_id: String(full.property_id ?? ''),
          floor_id: full.floor_id ?? '',
          unit_ids: (full.unit_ids ?? []).map(String),
          type: full.type ?? 'Residential',
          amount: full.amount ?? '',
          maintenance: full.maintenance ?? '',
          tax: full.tax ?? '',
          wtax_applicable: full.wtax_applicable === 'on',
          wtax: full.wtax ?? '',
          start_date: full.start_date?.slice(0, 10) ?? '',
          end_date: full.end_date?.slice(0, 10) ?? '',
          due_on: full.due_on ?? '1',
        })
        setDepositForm({
          rent_deposit: full.rent_deposit ?? '',
          deposits: (full.deposits ?? []).map(d => ({ utility_type: String(d.utility_type), utility: d.utility })),
        })
        setExistingDocs(full.document_image ? full.document_image.split(',').filter(Boolean) : [])
        await fetchFloors(String(full.property_id ?? ''))
        await fetchUnits(String(full.property_id ?? ''), full.floor_id ?? '')
      } catch { setError('Failed to load lease') }
      finally { setLoading(false) }
    })()
  }, [leaseId, fetchFloors, fetchUnits])

  const finalAmount = computeFinalAmount({
    amount: leaseForm.amount, maintenance: leaseForm.maintenance, tax: leaseForm.tax,
    wtaxApplicable: leaseForm.wtax_applicable, wtax: leaseForm.wtax,
  })

  const onPropertyChange = (propertyId: string) => {
    setLeaseForm(f => ({ ...f, property_id: propertyId, floor_id: '', unit_ids: [] }))
    setUnits([])
    fetchFloors(propertyId)
  }
  const onFloorChange = (floorId: string) => {
    setLeaseForm(f => ({ ...f, floor_id: floorId, unit_ids: [] }))
    fetchUnits(leaseForm.property_id, floorId)
  }

  const uploadFile = async (file: File): Promise<string | null> => {
    const body = new FormData()
    body.append('file', file)
    const res = await fetch(`${API}/document/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('apt_token')}` },
      body,
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.url ?? null
  }

  const save = async () => {
    if (!leaseId && (!leaseForm.renter_id || !leaseForm.property_id)) return
    if (!leaseForm.amount || !leaseForm.start_date || !leaseForm.end_date) return
    setSaving(true); setError('')
    try {
      const uploadedUrls: string[] = []
      for (const file of newDocs) {
        const url = await uploadFile(file)
        if (url) uploadedUrls.push(url)
      }
      const documentImage = [...existingDocs, ...uploadedUrls].join(',') || null

      const url = leaseId ? `${API}/leases/${leaseId}` : `${API}/leases`
      const method = leaseId ? 'PUT' : 'POST'
      const body: Record<string, unknown> = {
        floor_id: leaseForm.floor_id || null,
        type: leaseForm.type,
        amount: leaseForm.amount,
        maintenance: leaseForm.maintenance || '0',
        tax: leaseForm.tax || null,
        wtax_applicable: leaseForm.wtax_applicable ? 'on' : '',
        wtax: leaseForm.wtax_applicable ? leaseForm.wtax : null,
        rent_amount: finalAmount,
        start_date: leaseForm.start_date,
        end_date: leaseForm.end_date,
        due_on: leaseForm.due_on,
        document_image: documentImage,
        rent_deposit: depositForm.rent_deposit || 0,
        unit_ids: leaseForm.unit_ids.map(Number),
        deposits: depositForm.deposits.filter(d => d.utility_type && d.utility).map(d => ({ utility_type: Number(d.utility_type), utility: d.utility })),
        property_id: parseInt(leaseForm.property_id, 10),
      }
      if (!leaseId) {
        body.renter_id = parseInt(leaseForm.renter_id, 10)
        body.status = 1
      }
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      router.push('/dashboard/leases')
    } catch { setError(leaseId ? 'Failed to update lease' : 'Failed to create lease') }
    finally { setSaving(false) }
  }

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>{leaseId ? 'Edit Lease' : 'New Lease'}</h1>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/leases')}>← Back to Leases</button>
      </div>

      <div className="af-tab-bar" style={{ marginBottom: 18 }}>
        {WIZARD_STEPS.map(s => (
          <button key={s} onClick={() => setWizardStep(s)} className={`af-tab-pill ${wizardStep === s ? 'active' : ''}`}>{s}</button>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 820 }}>
        {wizardStep === 'Lease Info' && (
          <div className="af-modal-form">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="af-field">
                <label>Renter</label>
                <select className="af-select" value={leaseForm.renter_id} onChange={e => setLeaseForm(f => ({ ...f, renter_id: e.target.value }))} disabled={!!leaseId}>
                  <option value="">-- Select Renter --</option>
                  {renters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="af-field">
                <label>Property</label>
                <select className="af-select" value={leaseForm.property_id} onChange={e => onPropertyChange(e.target.value)}>
                  <option value="">-- Select Property --</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.property_name}</option>)}
                </select>
              </div>
              <div className="af-field">
                <label>Floor</label>
                <select className="af-select" value={leaseForm.floor_id} onChange={e => onFloorChange(e.target.value)}>
                  <option value="">-- Select Floor --</option>
                  {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div className="af-field">
                <label>Unit(s)</label>
                <select className="af-select" multiple value={leaseForm.unit_ids} style={{ height: 84 }}
                  onChange={e => setLeaseForm(f => ({ ...f, unit_ids: Array.from(e.target.selectedOptions, o => o.value) }))}>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="af-field">
                <label>Type</label>
                <select className="af-select" value={leaseForm.type} onChange={e => setLeaseForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                </select>
              </div>
              <div className="af-field"><label>Rent Amount</label><input type="number" min="0" step="0.01" value={leaseForm.amount} onChange={e => setLeaseForm(f => ({ ...f, amount: e.target.value }))} placeholder="10000"/></div>
              <div className="af-field"><label>Maintenance</label><input type="number" min="0" step="0.01" value={leaseForm.maintenance} onChange={e => setLeaseForm(f => ({ ...f, maintenance: e.target.value }))} placeholder="0"/></div>
              <div className="af-field">
                <label>VAT (%)</label>
                <select className="af-select" value={leaseForm.tax} onChange={e => setLeaseForm(f => ({ ...f, tax: e.target.value }))}>
                  <option value="">-- Select VAT --</option>
                  {taxes.map(t => <option key={t.id} value={t.value}>{t.key} ({t.value}%)</option>)}
                </select>
              </div>
              <div className="af-field">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={leaseForm.wtax_applicable} onChange={e => setLeaseForm(f => ({ ...f, wtax_applicable: e.target.checked }))} />
                  Wtax Applicable
                </label>
                {leaseForm.wtax_applicable && (
                  <select className="af-select" value={leaseForm.wtax} onChange={e => setLeaseForm(f => ({ ...f, wtax: e.target.value }))}>
                    <option value="">-- Select WTAX --</option>
                    {wtaxes.map(w => <option key={w.id} value={w.value}>{w.key} ({w.value}%)</option>)}
                  </select>
                )}
              </div>
              <div className="af-field"><label>Final Amount</label><input readOnly value={finalAmount} style={{ opacity: 0.75 }}/></div>
              <div className="af-field"><label>Start Date</label><DatePicker value={leaseForm.start_date} onChange={v => setLeaseForm(f => ({ ...f, start_date: v }))}/></div>
              <div className="af-field"><label>End Date</label><DatePicker value={leaseForm.end_date} onChange={v => setLeaseForm(f => ({ ...f, end_date: v }))}/></div>
              <div className="af-field">
                <label>Due On (Day of Month)</label>
                <select className="af-select" value={leaseForm.due_on} onChange={e => setLeaseForm(f => ({ ...f, due_on: e.target.value }))}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="af-field" style={{ gridColumn: 'span 2' }}>
                <label>Agreement Document</label>
                <input type="file" multiple onChange={e => setNewDocs(Array.from(e.target.files ?? []))} />
                {existingDocs.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                    {existingDocs.map((d, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)', borderRadius: 8, padding: '6px 10px', fontSize: 12.5 }}>
                        <a href={`${API}${d}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{d.split('/').pop()}</a>
                        <button onClick={() => setExistingDocs(docs => docs.filter((_, di) => di !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {wizardStep === 'Deposits' && (
          <div className="af-modal-form">
            <div className="af-field"><label>Rent Deposit Amount</label><input type="number" min="0" step="0.01" value={depositForm.rent_deposit} onChange={e => setDepositForm(f => ({ ...f, rent_deposit: e.target.value }))} placeholder="20000"/></div>
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Utility Deposits</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {depositForm.deposits.map((d, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8 }}>
                    <select className="af-select" value={d.utility_type} style={{ flex: '1 1 auto' }}
                      onChange={e => setDepositForm(f => ({ ...f, deposits: f.deposits.map((x, xi) => xi === i ? { ...x, utility_type: e.target.value } : x) }))}>
                      <option value="">-- Utility Type --</option>
                      {propertyUtilities.map(u => <option key={u.id} value={u.id}>{u.display_name || u.name}</option>)}
                    </select>
                    <input type="number" min="0" step="0.01" placeholder="Amount" value={d.utility} style={{ flex: '0 0 140px' }}
                      onChange={e => setDepositForm(f => ({ ...f, deposits: f.deposits.map((x, xi) => xi === i ? { ...x, utility: e.target.value } : x) }))} />
                    <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setDepositForm(f => ({ ...f, deposits: f.deposits.filter((_, xi) => xi !== i) }))}>Remove</button>
                  </div>
                ))}
                <button className="af-btn-secondary" style={{ cursor: 'pointer', alignSelf: 'flex-start' }}
                  onClick={() => setDepositForm(f => ({ ...f, deposits: [...f.deposits, { utility_type: '', utility: '' }] }))}>+ Add More</button>
              </div>
            </div>
          </div>
        )}

        {error && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/leases')} disabled={saving}>Cancel</button>
          <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : leaseId ? 'Update' : 'Create lease'}
          </button>
        </div>
      </div>
    </main>
  )
}
