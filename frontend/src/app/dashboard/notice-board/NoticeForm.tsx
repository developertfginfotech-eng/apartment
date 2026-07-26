'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

const ROLE_OPTIONS = ['Tenants', 'Owners', 'Staff'] as const

interface Notice {
  id: string
  title: string
  desc: string
  recipient: string
  attachment: string | null
  status: 'active' | 'inactive'
}

const EMPTY_FORM = { title: '', desc: '', recipient: 'All', status: 'active' as Notice['status'] }

export default function NoticeForm({ noticeId }: { noticeId?: string }) {
  const router = useRouter()
  useEffect(() => { if (!localStorage.getItem('apt_token')) router.push('/login') }, [router])

  const [form, setForm] = useState(EMPTY_FORM)
  const [mode, setMode] = useState<'all' | 'role'>('all')
  const [roles, setRoles] = useState<string[]>([])
  const [existingAttachment, setExistingAttachment] = useState<string | null>(null)
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(!!noticeId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('apt_token')}`,
  })

  useEffect(() => {
    if (!noticeId) return
    (async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/notice-board/${noticeId}`, { headers: authHeaders() })
        const n = await res.json()
        setForm({
          title: n.title ?? '',
          desc: n.desc ?? '',
          recipient: n.recipient ?? 'All',
          status: n.status ?? 'active',
        })
        setExistingAttachment(n.attachment ?? null)
        if (!n.recipient || n.recipient === 'All') {
          setMode('all'); setRoles([])
        } else {
          setMode('role'); setRoles(String(n.recipient).split(',').filter(Boolean))
        }
      } catch { setError('Failed to load notice') }
      finally { setLoading(false) }
    })()
  }, [noticeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const sf = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(f => ({ ...f, [k]: v }))

  const toggleRole = (role: string) => {
    setRoles(rs => rs.includes(role) ? rs.filter(r => r !== role) : [...rs, role])
  }

  const save = async () => {
    if (!form.title.trim() || !form.desc.trim()) return
    if (mode === 'role' && roles.length === 0) { setError('Select at least one role'); return }
    setSaving(true); setError('')
    try {
      let attachment = existingAttachment
      if (attachmentFile) {
        const fd = new FormData()
        fd.append('file', attachmentFile)
        const upRes = await fetch(`${API}/document/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('apt_token')}` },
          body: fd,
        })
        const data = await upRes.json()
        attachment = data.url ?? null
      }
      const recipient = mode === 'all' ? 'All' : roles.join(',')
      const currentUser = JSON.parse(localStorage.getItem('apt_user') ?? '{}')
      const url = noticeId ? `${API}/notice-board/${noticeId}` : `${API}/notice-board`
      const method = noticeId ? 'PUT' : 'POST'
      const body = { ...form, recipient, attachment, ...(noticeId ? {} : { sender: currentUser.name ?? 'Admin' }) }
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      router.push('/dashboard/notice-board')
    } catch { setError(noticeId ? 'Failed to update notice' : 'Failed to post notice') }
    finally { setSaving(false) }
  }

  if (loading) {
    return <main className="af-db-main"><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading…</div></main>
  }

  return (
    <main className="af-db-main">
      <div className="af-db-topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="af-db-greeting" style={{ fontSize: 26 }}>{noticeId ? 'Edit Notice' : 'Post Notice'}</h1>
        </div>
        <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/notice-board')}>← Back to Notice Board</button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, padding: 24, maxWidth: 680 }}>
        <div className="af-modal-form">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="af-field">
              <label>Title<span style={{ color: '#f87171' }}> *</span></label>
              <input value={form.title} onChange={e => sf('title', e.target.value)} placeholder="Notice title…" />
            </div>
            <div className="af-field">
              <label>Recipient</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}>
                    <input type="radio" checked={mode === 'all'} onChange={() => { setMode('all'); setRoles([]) }} />
                    To All
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}>
                    <input type="radio" checked={mode === 'role'} onChange={() => setMode('role')} />
                    Select By Role
                  </label>
                </div>
                {mode === 'role' && (
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {ROLE_OPTIONS.map(role => (
                      <label key={role} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <input type="checkbox" checked={roles.includes(role)} onChange={() => toggleRole(role)} />
                        {role}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="af-field">
            <label>Attachment</label>
            <input type="file" onChange={e => setAttachmentFile(e.target.files?.[0] ?? null)} />
            {existingAttachment && !attachmentFile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 12.5 }}>
                <a href={`${API}${existingAttachment}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{existingAttachment.split('/').pop()}</a>
                <button onClick={() => setExistingAttachment(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
              </div>
            )}
          </div>

          <div className="af-field">
            <label>Send Message<span style={{ color: '#f87171' }}> *</span></label>
            <textarea
              value={form.desc}
              onChange={e => sf('desc', e.target.value)}
              placeholder="Write the notice content here…"
              rows={6}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', fontSize: 13, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', outline: 'none' }}
            />
          </div>

          <div className="af-field">
            <label>Status</label>
            <select className="af-select" value={form.status} onChange={e => sf('status', e.target.value as Notice['status'])}>
              <option value="active">Active</option>
              <option value="inactive">Draft</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="af-btn-secondary" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard/notice-board')} disabled={saving}>Cancel</button>
          <button className="af-auth-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : noticeId ? 'Save changes' : 'Post notice'}
          </button>
        </div>
      </div>
    </main>
  )
}
