'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface UserInfo { name: string; role: string }

const NAV = [
  { href: '/dashboard',              label: 'Dashboard',       icon: '⊞' },
  { href: '/dashboard/owners',       label: 'Owners',          icon: '👤' },
  { href: '/dashboard/properties',   label: 'Properties',      icon: '🏢' },
  { href: '/dashboard/tenants',      label: 'Renters',         icon: '👥' },
  { href: '/dashboard/maintenance',  label: 'Maintenance',     icon: '🔧' },
  { href: '/dashboard/expenses',     label: 'Expenses',        icon: '💰' },
  { href: '/dashboard/utilities',    label: 'Utilities',       icon: '⚡' },
  { href: '/dashboard/leases',       label: 'Lease Agreement', icon: '📋' },
  { href: '/dashboard/messages',     label: 'Messages',        icon: '✉️' },
  { href: '/dashboard/notice-board', label: 'Notice Board',    icon: '📌' },
  { href: '/dashboard/payments',     label: 'Payments',        icon: '💳' },
  { href: '/dashboard/reports',      label: 'Reports',         icon: '📊' },
  { href: '/dashboard/activity-logs',label: 'Activity Logs',   icon: '🕐' },
  { href: '/dashboard/loan',         label: 'Loan',            icon: '🏦' },
  { href: '/dashboard/security-money',label:'Security Money',  icon: '🔐' },
  { href: '/dashboard/payroll',      label: 'Payroll',         icon: '💼' },
  { href: '/dashboard/taxes',        label: 'Taxes',           icon: '🧾' },
  { href: '/dashboard/settings',     label: 'Setting',         icon: '⚙️' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [user, setUser]         = useState<UserInfo | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const token  = localStorage.getItem('apt_token')
    const stored = localStorage.getItem('apt_user')
    if (!token || !stored) { router.push('/login'); return }
    try { setUser(JSON.parse(stored)) } catch { router.push('/login') }
  }, [router])

  const logout = useCallback(() => {
    localStorage.removeItem('apt_token')
    localStorage.removeItem('apt_user')
    router.push('/')
  }, [router])

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  return (
    <div className="af-db-page">
      {/* ── Sidebar ── */}
      <aside className={`af-db-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="af-db-sidebar-head">
          <Link className="af-nav-logo" href="/" style={{textDecoration:'none',gap:collapsed?0:9}}>
            <div className="af-nav-icon">AP</div>
            {!collapsed && <span>Apartment</span>}
          </Link>
          <button className="af-db-collapse-btn" onClick={() => setCollapsed(c => !c)} aria-label="Toggle sidebar">
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        <nav className="af-db-nav">
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={`af-db-nav-item ${isActive(n.href) ? 'active' : ''}`}
              title={collapsed ? n.label : undefined}
              style={{textDecoration:'none'}}
            >
              <span className="af-db-nav-icon">{n.icon}</span>
              {!collapsed && <span className="af-db-nav-label">{n.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="af-db-sidebar-footer">
          {!collapsed ? (
            <>
              <div className="af-db-user-pill">
                <div className="af-db-avatar">{user?.name?.[0]?.toUpperCase() ?? '?'}</div>
                <div>
                  <div className="af-db-uname">{user?.name}</div>
                  <div className="af-db-urole">{user?.role?.replace('_',' ')}</div>
                </div>
              </div>
              <button className="af-db-logout" onClick={logout}>Sign out</button>
            </>
          ) : (
            <button className="af-db-logout" onClick={logout} title="Sign out" style={{padding:'10px',width:'100%',display:'flex',justifyContent:'center'}}>↩</button>
          )}
        </div>
      </aside>

      {/* ── Page content ── */}
      <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {/* Top bar */}
        <header className="af-db-topnav">
          <div className="af-db-breadcrumb">
            {NAV.find(n => isActive(n.href))?.label ?? 'Dashboard'}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div className="af-db-user-chip">
              <div className="af-db-avatar" style={{width:28,height:28,fontSize:11}}>{user?.name?.[0]?.toUpperCase()}</div>
              <span style={{fontSize:13,fontWeight:600}}>{user?.name}</span>
              <span className="af-db-urole" style={{fontSize:11}}>{user?.role?.replace('_',' ')}</span>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <div style={{flex:1,overflowY:'auto'}}>
          {children}
        </div>
      </div>
    </div>
  )
}
