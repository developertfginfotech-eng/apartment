'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from '../../lib/useTheme'

interface UserInfo {
  name: string
  role: string
  permissions?: { module: string; actions: string[] }[]
}

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

const ADMIN_NAV_ITEM = { href: '/dashboard/admins', label: 'Admin Management', icon: '🛡️' }

// Mirrors backend/src/common/module-permission.guard.ts's MODULE_BY_PREFIX —
// keep both in sync when adding new gated sections.
const MODULE_BY_PATH: Record<string, string> = {
  '/dashboard/properties': 'properties',
  '/dashboard/owners': 'owners',
  '/dashboard/tenants': 'tenants',
  '/dashboard/leases': 'leases',
  '/dashboard/payments': 'payments',
  '/dashboard/maintenance': 'maintenance',
  '/dashboard/expenses': 'expenses',
  '/dashboard/utilities': 'utilities',
  '/dashboard/messages': 'messages',
  '/dashboard/notice-board': 'notice-board',
  '/dashboard/reports': 'reports',
  '/dashboard/activity-logs': 'activity-logs',
  '/dashboard/loan': 'loan',
  '/dashboard/security-money': 'security-money',
  '/dashboard/payroll': 'payroll',
  '/dashboard/taxes': 'taxes',
  '/dashboard/settings': 'settings',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [user, setUser]         = useState<UserInfo | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { dark, toggle: toggleTheme } = useTheme()

  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)')
    setIsMobile(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

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

  // On mobile the sidebar always opens at full width with labels — the desktop
  // icon-rail "collapsed" mode only applies at wider viewports.
  const showLabels = isMobile || !collapsed
  const isSuperAdmin = user?.role === 'super_admin'
  const navItems = isSuperAdmin ? [...NAV, ADMIN_NAV_ITEM] : NAV

  const requiredModule = Object.keys(MODULE_BY_PATH).find(p => pathname.startsWith(p))
  const authorized = !user || !requiredModule || isSuperAdmin ||
    (user.permissions ?? []).some(p => p.module === MODULE_BY_PATH[requiredModule])

  return (
    <div className="af-db-page">
      {/* ── Mobile backdrop ── */}
      <div className={`af-db-mobile-backdrop ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(false)} />

      {/* ── Sidebar ── */}
      <aside className={`af-db-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="af-db-sidebar-head">
          <Link className="af-nav-logo" href="/" style={{textDecoration:'none',gap:showLabels?9:0}}>
            <div className="af-nav-icon">AP</div>
            {showLabels && <span>Apartment</span>}
          </Link>
        </div>
        <button className="af-db-collapse-btn" onClick={() => setCollapsed(c => !c)} aria-label="Toggle sidebar">
          {collapsed ? '›' : '‹'}
        </button>

        <nav className="af-db-nav">
          {navItems.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={`af-db-nav-item ${isActive(n.href) ? 'active' : ''}`}
              title={!showLabels ? n.label : undefined}
              style={{textDecoration:'none'}}
            >
              <span className="af-db-nav-icon">{n.icon}</span>
              {showLabels && <span className="af-db-nav-label">{n.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="af-db-sidebar-footer">
          {showLabels ? (
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="af-db-hamburger" onClick={() => setMobileOpen(o => !o)} aria-label="Toggle menu">☰</button>
            <div className="af-db-breadcrumb">
              {NAV.find(n => isActive(n.href))?.label ?? (isActive(ADMIN_NAV_ITEM.href) ? ADMIN_NAV_ITEM.label : 'Dashboard')}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                display:'flex',alignItems:'center',justifyContent:'center',
                width:36,height:36,borderRadius:10,cursor:'pointer',
                background:'var(--surface2)',border:'1px solid var(--border2)',
                color:'var(--text)',fontSize:16,
              }}
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <div className="af-db-user-chip">
              <div className="af-db-avatar" style={{width:28,height:28,fontSize:11}}>{user?.name?.[0]?.toUpperCase()}</div>
              <span style={{fontSize:13,fontWeight:600}}>{user?.name}</span>
              <span className="af-db-urole" style={{fontSize:11}}>{user?.role?.replace('_',' ')}</span>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <div style={{flex:1,overflowY:'auto'}}>
          {authorized ? children : (
            <main className="af-db-main">
              <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--muted)' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🚫</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>You are not authorized</div>
                <div style={{ fontSize: 13.5 }}>You don&apos;t have access to this module. Contact your administrator if you need access.</div>
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  )
}
