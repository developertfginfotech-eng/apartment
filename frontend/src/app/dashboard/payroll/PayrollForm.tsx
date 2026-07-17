'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

const EMPTY_FORM = {
  employee_id:'', start_date:'', end_date:'', payment_date:'',
  basic:'0', ot_pay:'0', rental:'0', absences:'0', late:'0',
  sss:'0', phic:'0', hdmf:'0',
  sss_loan:'0', phic_loan:'0', hdmf_loan:'0', cash_advance:'0',
  allowance:'0', adjustment:'0',
}

export default function PayrollForm({ payrollId }: { payrollId?: number }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [employees, setEmployees] = useState<{id:number; name:string}[]>([])
  const [form, setForm]     = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(!!payrollId)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  useEffect(() => {
    fetch(`${API}/payroll/employees`, { headers: authHeaders() })
      .then(r => r.json()).then(d => Array.isArray(d) && setEmployees(d)).catch(()=>{})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!payrollId) return
    (async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/payroll/${payrollId}`, { headers: authHeaders() })
        const p = await res.json()
        setForm({
          employee_id: '', start_date: p.start_date ?? '', end_date: p.end_date ?? '',
          payment_date: p.payment_date ?? '',
          basic: String(p.basic ?? 0), ot_pay: String(p.ot_pay ?? 0), rental: String(p.rental ?? 0),
          absences: String(p.absences ?? 0), late: String(p.late ?? 0),
          sss: String(p.sss ?? 0), phic: String(p.phic ?? 0), hdmf: String(p.hdmf ?? 0),
          sss_loan: String(p.sss_loan ?? 0), phic_loan: '0', hdmf_loan: String(p.hdmf_loan ?? 0),
          cash_advance: String(p.cash_advance ?? 0), allowance: String(p.allowance ?? 0), adjustment: String(p.adjustment ?? 0),
        })
      } catch { setError('Failed to load payroll record') }
      finally { setLoading(false) }
    })()
  }, [payrollId]) // eslint-disable-line react-hooks/exhaustive-deps

  const n = (v:string) => parseFloat(v)||0
  // Match Laravel formula exactly:
  // G-Pay = basic + ot_pay - rental - absences - late
  // G-Pay Net = G-Pay - SSS - PHIC - HDMF
  // Net Pay = G-Pay Net - SSS Loan - HDMF Loan - Cash Advance + Allowance + Adjustment
  const liveGPay    = n(form.basic) + n(form.ot_pay) - n(form.rental) - n(form.absences) - n(form.late)
  const liveGPayNet = liveGPay - n(form.sss) - n(form.phic) - n(form.hdmf)
  const liveNet     = liveGPayNet - n(form.sss_loan) - n(form.hdmf_loan) - n(form.cash_advance) + n(form.allowance) + n(form.adjustment)

  const fmt = (v: number|string) => `₱ ${Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`

  const save = async () => {
    if (!form.start_date || !form.end_date) return
    setSaving(true); setError('')
    const body = {
      employee_id: form.employee_id ? parseInt(form.employee_id) : null,
      start_date: form.start_date, end_date: form.end_date, payment_date: form.payment_date,
      basic: n(form.basic), ot_pay: n(form.ot_pay), rental: n(form.rental),
      absences: n(form.absences), late: n(form.late),
      g_pay: liveGPay,
      sss: n(form.sss), phic: n(form.phic), hdmf: n(form.hdmf),
      g_pay_net: liveGPayNet,
      gross_pay: liveGPay, gross_pay_net: liveGPayNet,
      sss_loan: n(form.sss_loan), hdmf_loan: n(form.hdmf_loan),
      cash_advance: n(form.cash_advance),
      allowance: n(form.allowance), adjustment: n(form.adjustment),
      net_pay: liveNet,
    }
    try {
      const url = payrollId ? `${API}/payroll/${payrollId}` : `${API}/payroll`
      const method = payrollId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      router.push('/dashboard/payroll')
    } catch { setError(payrollId ? 'Failed to update payroll record' : 'Failed to save') }
    finally { setSaving(false) }
  }

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>{payrollId ? 'Edit Payroll' : 'Add Payroll'}</h1>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/payroll')}>← Back to Payroll</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 820 }}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
          {employees.length>0 && (
            <div className="af-field" style={{gridColumn:'span 3'}}>
              <label>Employee</label>
              <select className="af-select" value={form.employee_id} onChange={e=>setForm(f=>({...f,employee_id:e.target.value}))}>
                <option value="">-- Select Employee --</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          )}
          <div className="af-field"><label>Start Date</label><input type="date" value={form.start_date} onChange={e=>setForm(f=>({...f,start_date:e.target.value}))}/></div>
          <div className="af-field"><label>End Date</label><input type="date" value={form.end_date} onChange={e=>setForm(f=>({...f,end_date:e.target.value}))}/></div>
          <div className="af-field"><label>Payment Date</label><input type="date" value={form.payment_date} onChange={e=>setForm(f=>({...f,payment_date:e.target.value}))}/></div>

          <div style={{gridColumn:'span 3',borderTop:'1px solid var(--border2)',paddingTop:10,fontSize:10,fontWeight:700,color:'var(--muted)',letterSpacing:'0.06em',textTransform:'uppercase'}}>Earnings</div>

          {([['basic','Basic Pay'],['ot_pay','OT Pay'],['rental','Rental'],['absences','Absences'],['late','Late']] as const).map(([k,l])=>(
            <div key={k} className="af-field"><label>{l}</label>
              <input type="number" step="0.01" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder="0.00"/></div>
          ))}
          <div className="af-field">
            <label style={{color:'var(--accent)'}}>G-Pay</label>
            <input type="number" readOnly value={liveGPay.toFixed(2)} style={{opacity:0.7,cursor:'not-allowed'}}/>
          </div>

          {([['sss','SSS'],['phic','PHIC'],['hdmf','HDMF']] as const).map(([k,l])=>(
            <div key={k} className="af-field"><label>{l}</label>
              <input type="number" step="0.01" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder="0.00"/></div>
          ))}
          <div className="af-field">
            <label style={{color:'var(--accent)'}}>G-PAY NET</label>
            <input type="number" readOnly value={liveGPayNet.toFixed(2)} style={{opacity:0.7,cursor:'not-allowed'}}/>
          </div>
          <div className="af-field"><label>SSS Loan</label>
            <input type="number" step="0.01" value={form.sss_loan} onChange={e=>setForm(f=>({...f,sss_loan:e.target.value}))} placeholder="0.00"/></div>
          <div className="af-field"><label>Phic Loan</label>
            <input type="number" step="0.01" value={form.phic_loan} onChange={e=>setForm(f=>({...f,phic_loan:e.target.value}))} placeholder="0.00"/></div>

          <div className="af-field"><label>HDMF Loan</label>
            <input type="number" step="0.01" value={form.hdmf_loan} onChange={e=>setForm(f=>({...f,hdmf_loan:e.target.value}))} placeholder="0.00"/></div>
          <div className="af-field"><label>payment loan</label>
            <input type="number" step="0.01" value={form.cash_advance} onChange={e=>setForm(f=>({...f,cash_advance:e.target.value}))} placeholder="0.00"/></div>
          <div className="af-field"><label>Allowance</label>
            <input type="number" step="0.01" value={form.allowance} onChange={e=>setForm(f=>({...f,allowance:e.target.value}))} placeholder="0.00"/></div>
          <div className="af-field"><label>Adjustment</label>
            <input type="number" step="0.01" value={form.adjustment} onChange={e=>setForm(f=>({...f,adjustment:e.target.value}))} placeholder="0.00"/></div>
          <div className="af-field" style={{gridColumn:'span 2'}}>
            <label style={{color:'#22c55e',fontWeight:700}}>Net Pay (Auto Calculated)</label>
            <input readOnly value={fmt(liveNet)} style={{opacity:0.85,cursor:'not-allowed',color:'#22c55e',fontWeight:700}}/>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/payroll')} disabled={saving}>Cancel</button>
          <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 28px' }} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : payrollId ? 'Save Changes' : 'Add Payroll'}
          </button>
        </div>
      </div>
    </main>
  )
}
