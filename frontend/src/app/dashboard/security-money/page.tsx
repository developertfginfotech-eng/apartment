'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Lease {
  id: string
  lease_no: string
  renter: string
  property: string
  unit: string
  deposit: number
}

interface Transaction {
  id: string
  lease_id: string
  type: 'add' | 'refund'
  amount: number
  title: string
  reason?: string
  date: string
}

const SEED_LEASES: Lease[] = [
  { id: 'sl1', lease_no: 'LS0001', renter: 'James Carter',  property: 'Sunrise Towers',    unit: '4B', deposit: 4400 },
  { id: 'sl2', lease_no: 'LS0002', renter: 'Priya Sharma',  property: 'Green Valley Block', unit: '2A', deposit: 3200 },
  { id: 'sl3', lease_no: 'LS0003', renter: 'Marco Rivera',  property: 'Sunrise Towers',    unit: '7C', deposit: 3900 },
  { id: 'sl4', lease_no: 'LS0004', renter: 'Aisha Okonkwo', property: 'Metro Heights',     unit: '1D', deposit: 4200 },
]

const SEED_TRANSACTIONS: Transaction[] = [
  { id: 't1', lease_id: 'sl1', type: 'add',    amount: 4400, title: 'Initial deposit',  date: '2024-01-01' },
  { id: 't2', lease_id: 'sl2', type: 'add',    amount: 3700, title: 'Initial deposit',  date: '2024-04-01' },
  { id: 't3', lease_id: 'sl2', type: 'refund', amount: 500,  title: 'Partial refund',   reason: 'Damage repair', date: '2025-02-01' },
  { id: 't4', lease_id: 'sl3', type: 'add',    amount: 3900, title: 'Initial deposit',  date: '2025-07-01' },
  { id: 't5', lease_id: 'sl4', type: 'add',    amount: 4200, title: 'Initial deposit',  date: '2024-02-01' },
]

type ModalMode = 'history' | 'transaction' | null

export default function SecurityMoneyPage() {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [leases, setLeases] = useState<Lease[]>(SEED_LEASES)
  const [transactions, setTransactions] = useState<Transaction[]>(SEED_TRANSACTIONS)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null)
  const [form, setForm] = useState({ type: 'add' as 'add' | 'refund', amount: '', title: '', reason: '', date: '' })

  const totalHeld = leases.reduce((sum, l) => sum + l.deposit, 0)

  const openHistory = (lease: Lease) => { setSelectedLease(lease); setModalMode('history') }
  const openTransaction = (lease: Lease) => {
    setSelectedLease(lease)
    setForm({ type: 'add', amount: '', title: '', reason: '', date: '' })
    setModalMode('transaction')
  }
  const closeModal = () => { setModalMode(null); setSelectedLease(null) }

  const submitTransaction = () => {
    if (!selectedLease || !form.amount || !form.title || !form.date) return
    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0) return

    const newTx: Transaction = {
      id: `t${Date.now()}`,
      lease_id: selectedLease.id,
      type: form.type,
      amount: amt,
      title: form.title,
      reason: form.reason || undefined,
      date: form.date,
    }

    setTransactions(txs => [newTx, ...txs])
    setLeases(ls => ls.map(l =>
      l.id === selectedLease.id
        ? { ...l, deposit: form.type === 'add' ? l.deposit + amt : l.deposit - amt }
        : l
    ))
    closeModal()
  }

  const leaseTxs = selectedLease
    ? transactions.filter(t => t.lease_id === selectedLease.id)
    : []

  return (
    <main className="af-db-main">
      <div className="af-db-topbar">
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>Security Money</h1>
          <p className="af-db-subtitle">Security deposits and refund tracking</p>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, padding: '18px 24px', minWidth: 180 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>TOTAL SECURITY HELD</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#22c55e' }}>${totalHeld.toLocaleString()}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, padding: '18px 24px', minWidth: 160 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>ACTIVE LEASES</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>{leases.length}</div>
        </div>
      </div>

      <div className="af-prop-table-wrap">
        <table className="af-prop-table">
          <thead>
            <tr>
              <th>Lease No</th>
              <th>Renter</th>
              <th>Property</th>
              <th>Unit</th>
              <th>Current Deposit Balance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {leases.map(l => (
              <tr key={l.id}>
                <td><span className="af-prop-badge type">{l.lease_no}</span></td>
                <td style={{ fontWeight: 650 }}>{l.renter}</td>
                <td style={{ fontSize: 13, color: 'var(--muted)' }}>{l.property}</td>
                <td>{l.unit}</td>
                <td style={{ fontWeight: 700, color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>
                  ${l.deposit.toLocaleString()}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="af-btn-secondary"
                      style={{ cursor: 'pointer', padding: '6px 12px', fontSize: 12.5 }}
                      onClick={() => openHistory(l)}
                    >
                      View History
                    </button>
                    <button
                      className="af-btn-primary"
                      style={{ cursor: 'pointer', border: 'none', padding: '6px 12px', fontSize: 12.5 }}
                      onClick={() => openTransaction(l)}
                    >
                      Add / Refund
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* History Modal */}
      {modalMode === 'history' && selectedLease && (
        <div className="af-modal-overlay" onClick={closeModal}>
          <div className="af-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <h2 className="af-modal-title">Transaction History — {selectedLease.lease_no}</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              {selectedLease.renter} · {selectedLease.property} · Unit {selectedLease.unit}
            </p>
            {leaseTxs.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>No transactions found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {leaseTxs.map(tx => (
                  <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface2)', borderRadius: 10, padding: '12px 16px', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100,
                        background: tx.type === 'add' ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.14)',
                        color: tx.type === 'add' ? '#22c55e' : '#ef4444',
                        textTransform: 'uppercase',
                      }}>
                        {tx.type}
                      </span>
                      <div>
                        <div style={{ fontWeight: 650, fontSize: 13.5 }}>{tx.title}</div>
                        {tx.reason && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{tx.reason}</div>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: tx.type === 'add' ? '#22c55e' : '#ef4444' }}>
                        {tx.type === 'add' ? '+' : '-'}${tx.amount.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{tx.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Refund Modal */}
      {modalMode === 'transaction' && selectedLease && (
        <div className="af-modal-overlay" onClick={closeModal}>
          <div className="af-modal" onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">Add / Refund — {selectedLease.lease_no}</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              {selectedLease.renter} · Current balance: <strong style={{ color: '#22c55e' }}>${selectedLease.deposit.toLocaleString()}</strong>
            </p>
            <div className="af-modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="af-field" style={{ gridColumn: 'span 2' }}>
                  <label>Type</label>
                  <select
                    className="af-select"
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as 'add' | 'refund' }))}
                  >
                    <option value="add">Add</option>
                    <option value="refund">Refund</option>
                  </select>
                </div>
                <div className="af-field">
                  <label>Amount ($)</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="af-field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div className="af-field" style={{ gridColumn: 'span 2' }}>
                  <label>Title</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Initial deposit"
                  />
                </div>
                <div className="af-field" style={{ gridColumn: 'span 2' }}>
                  <label>Reason (optional)</label>
                  <input
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    placeholder="e.g. Damage repair"
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={closeModal}>Cancel</button>
              <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={submitTransaction}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
