'use client'

import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../lib/useTheme'

/* ── SVG helpers ─────────────────────────────────────────────────────────── */
type ArrProps = { x1:number; y1:number; x2:number; y2:number; dashed?:boolean }
function SArrow({ x1, y1, x2, y2, dashed = false }: ArrProps) {
  const dx = x2-x1, dy = y2-y1, len = Math.hypot(dx, dy)
  if (len < 1) return null
  const ux = dx/len, uy = dy/len, L = 5.5
  const p1x = x2 - L*ux - L*0.38*uy, p1y = y2 - L*uy + L*0.38*ux
  const p2x = x2 - L*ux + L*0.38*uy, p2y = y2 - L*uy - L*0.38*ux
  const c = dashed ? 'rgba(80,140,220,0.55)' : 'rgba(80,140,220,0.75)'
  return <>
    <path d={`M${x1},${y1} L${x2},${y2}`} stroke={c} strokeWidth="1.2" fill="none" strokeDasharray={dashed ? '4,3' : undefined}/>
    <polygon points={`${x2},${y2} ${p1x},${p1y} ${p2x},${p2y}`} fill={c}/>
  </>
}

type CrvProps = { d:string; ex:number; ey:number; etx:number; ety:number; dashed?:boolean }
function CArrow({ d, ex, ey, etx, ety, dashed = false }: CrvProps) {
  const len = Math.hypot(etx, ety)
  if (len < 0.01) return null
  const ux = etx/len, uy = ety/len, L = 5.5
  const p1x = ex - L*ux - L*0.38*uy, p1y = ey - L*uy + L*0.38*ux
  const p2x = ex - L*ux + L*0.38*uy, p2y = ey - L*uy - L*0.38*ux
  const c = dashed ? 'rgba(80,140,220,0.5)' : 'rgba(80,140,220,0.72)'
  return <>
    <path d={d} stroke={c} strokeWidth="1.2" fill="none" strokeDasharray={dashed ? '4,3' : undefined}/>
    <polygon points={`${ex},${ey} ${p1x},${p1y} ${p2x},${p2y}`} fill={c}/>
  </>
}

type CNProps = { cx:number; cy:number; r?:number; emoji:string; label:string; color:string }
function CNode({ cx, cy, r=22, emoji, label, color }: CNProps) {
  return <g>
    <circle cx={cx} cy={cy} r={r} fill="rgba(10,12,25,0.92)" stroke={color} strokeWidth="1.4"/>
    <circle cx={cx} cy={cy} r={r-5} fill={`${color}20`}/>
    <text x={cx} y={cy+4.5} textAnchor="middle" fontSize={r > 19 ? 13 : 11} dominantBaseline="middle">{emoji}</text>
    <text x={cx} y={cy+r+10} textAnchor="middle" fontSize={7} fill="rgba(160,185,220,0.72)" fontWeight="600" letterSpacing="0.02em">{label}</text>
  </g>
}

type RNProps = { x:number; y:number; w?:number; h?:number; emoji:string; label:string; sub?:string; color:string }
function RNode({ x, y, w=80, h=36, emoji, label, sub='', color }: RNProps) {
  return <g>
    <rect x={x} y={y} width={w} height={h} rx={7} fill="rgba(10,12,25,0.92)" stroke="rgba(255,255,255,0.09)" strokeWidth="1"/>
    <rect x={x+1} y={y+5} width={2.5} height={h-10} rx={1.2} fill={color} opacity="0.8"/>
    <text x={x+14} y={y+h/2} textAnchor="middle" dominantBaseline="middle" fontSize={11}>{emoji}</text>
    <text x={x+25} y={sub ? y+h/2-4 : y+h/2} fontSize={8.5} fill="rgba(215,228,248,0.92)" fontWeight="700" dominantBaseline={sub ? undefined : 'middle'}>{label}</text>
    {sub && <text x={x+25} y={y+h/2+6} fontSize={6.5} fill="rgba(110,135,170,0.72)">{sub}</text>}
  </g>
}

/* ── Workflow diagrams (6 total, viewBox 0 0 270 150) ────────────────────── */
function DiagOnboarding() {
  return <svg viewBox="0 0 270 150" className="af-wf-svg">
    <CNode cx={24} cy={75} r={22} emoji="👤" label="New Tenant" color="#f97316"/>
    <SArrow x1={46} y1={75} x2={56} y2={75}/>
    <circle cx={46} cy={75} r={3} fill="#22c55e" opacity="0.8"/>
    <RNode x={56} y={57} w={76} h={36} emoji="📋" label="Verify ID" sub="document" color="#3b82f6"/>
    <SArrow x1={132} y1={75} x2={142} y2={75}/>
    <RNode x={142} y={57} w={76} h={36} emoji="🔍" label="Background" sub="check" color="#f59e0b"/>
    <CArrow d="M218,75 C230,75 230,48 234,48" ex={234} ey={48} etx={4} ety={0}/>
    <CArrow d="M218,75 C230,75 230,110 234,110" ex={234} ey={110} etx={4} ety={0} dashed/>
    <CNode cx={252} cy={48} r={18} emoji="✅" label="Approve" color="#22c55e"/>
    <CNode cx={252} cy={110} r={18} emoji="❌" label="Reject" color="#ef4444"/>
  </svg>
}

function DiagRentCollection() {
  return <svg viewBox="0 0 270 150" className="af-wf-svg">
    <CNode cx={24} cy={75} r={22} emoji="📅" label="Monthly Due" color="#f97316"/>
    <SArrow x1={46} y1={75} x2={56} y2={75}/>
    <circle cx={46} cy={75} r={3} fill="#22c55e" opacity="0.8"/>
    <RNode x={56} y={57} w={76} h={36} emoji="💰" label="Invoice" sub="generate" color="#3b82f6"/>
    <SArrow x1={132} y1={75} x2={142} y2={75}/>
    <RNode x={142} y={57} w={76} h={36} emoji="💳" label="Collect" sub="payment" color="#a855f7"/>
    <CArrow d="M218,75 C230,75 230,46 234,46" ex={234} ey={46} etx={4} ety={0}/>
    <CArrow d="M218,75 C230,75 230,112 234,112" ex={234} ey={112} etx={4} ety={0} dashed/>
    <CNode cx={252} cy={46} r={18} emoji="✅" label="Paid" color="#22c55e"/>
    <CNode cx={252} cy={112} r={18} emoji="⚠️" label="Remind" color="#f59e0b"/>
  </svg>
}

function DiagMaintenance() {
  return <svg viewBox="0 0 270 150" className="af-wf-svg">
    <CNode cx={24} cy={75} r={22} emoji="💬" label="Request" color="#f97316"/>
    <SArrow x1={46} y1={75} x2={56} y2={75}/>
    <circle cx={46} cy={75} r={3} fill="#22c55e" opacity="0.8"/>
    <RNode x={56} y={51} w={88} h={48} emoji="🤖" label="AI Triage" sub="tools agent" color="#8b5cf6"/>
    <SArrow x1={144} y1={75} x2={174} y2={75}/>
    <CArrow d="M144,75 C158,75 158,28 174,28" ex={174} ey={28} etx={16} ety={0} dashed/>
    <CArrow d="M144,75 C158,75 158,125 174,125" ex={174} ey={125} etx={16} ety={0} dashed/>
    <circle cx={144} cy={75} r={3.5} fill="#8b5cf6" opacity="0.8"/>
    <CNode cx={194} cy={28} r={20} emoji="🔧" label="Assign" color="#3b82f6"/>
    <CNode cx={194} cy={75} r={20} emoji="📱" label="Notify" color="#14b8a6"/>
    <CNode cx={194} cy={125} r={20} emoji="📊" label="Track" color="#f59e0b"/>
  </svg>
}

function DiagLeaseRenewal() {
  return <svg viewBox="0 0 270 150" className="af-wf-svg">
    <CNode cx={24} cy={75} r={22} emoji="⏰" label="60-Day Alert" color="#f97316"/>
    <SArrow x1={46} y1={75} x2={56} y2={75}/>
    <circle cx={46} cy={75} r={3} fill="#22c55e" opacity="0.8"/>
    <RNode x={56} y={59} w={72} h={32} emoji="📄" label="Draft" color="#3b82f6"/>
    <SArrow x1={128} y1={75} x2={138} y2={75}/>
    <RNode x={138} y={59} w={72} h={32} emoji="✉️" label="Send" color="#14b8a6"/>
    <SArrow x1={210} y1={75} x2={228} y2={75}/>
    <circle cx={210} cy={75} r={3} fill="#22c55e" opacity="0.8"/>
    <CNode cx={248} cy={75} r={20} emoji="✍️" label="Sign" color="#22c55e"/>
  </svg>
}

function DiagInspection() {
  return <svg viewBox="0 0 270 150" className="af-wf-svg">
    <line x1={135} y1={20} x2={135} y2={130} stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4,4"/>
    <CNode cx={22} cy={38} r={18} emoji="📅" label="Schedule" color="#3b82f6"/>
    <SArrow x1={40} y1={38} x2={50} y2={38}/>
    <RNode x={50} y={24} w={72} h={28} emoji="👷" label="Assign" color="#3b82f6"/>
    <SArrow x1={122} y1={38} x2={162} y2={38}/>
    <CNode cx={182} cy={38} r={20} emoji="📸" label="Report" color="#22c55e"/>
    <CNode cx={22} cy={112} r={18} emoji="💬" label="Request" color="#f97316"/>
    <SArrow x1={40} y1={112} x2={50} y2={112}/>
    <RNode x={50} y={98} w={72} h={28} emoji="⚡" label="Triage" color="#f59e0b"/>
    <SArrow x1={122} y1={112} x2={162} y2={112}/>
    <CNode cx={182} cy={112} r={20} emoji="🔧" label="Action" color="#a855f7"/>
  </svg>
}

function DiagUtilityBilling() {
  return <svg viewBox="0 0 270 150" className="af-wf-svg">
    <CNode cx={24} cy={75} r={22} emoji="⚡" label="Meter Read" color="#3b82f6"/>
    <SArrow x1={46} y1={75} x2={56} y2={75}/>
    <circle cx={46} cy={75} r={3} fill="#22c55e" opacity="0.8"/>
    <RNode x={56} y={57} w={78} h={36} emoji="🔢" label="Calculate" sub="billing" color="#3b82f6"/>
    <SArrow x1={134} y1={75} x2={146} y2={75}/>
    <RNode x={146} y={57} w={70} h={36} emoji="📄" label="Bill" sub="send" color="#f97316"/>
    <CArrow d="M216,75 C228,75 228,46 234,46" ex={234} ey={46} etx={6} ety={0}/>
    <CArrow d="M216,75 C228,75 228,108 234,108" ex={234} ey={108} etx={6} ety={0} dashed/>
    <CNode cx={252} cy={46} r={18} emoji="✅" label="Paid" color="#22c55e"/>
    <CNode cx={252} cy={108} r={18} emoji="📬" label="Chase" color="#ef4444"/>
  </svg>
}

/* ── Sliding section ─────────────────────────────────────────────────────── */
type DiagramCard = { name: string; cat: string; Diagram: () => React.ReactElement }
const DIAGRAMS: DiagramCard[] = [
  { name: 'Tenant Onboarding',  cat: 'Leasing',      Diagram: DiagOnboarding },
  { name: 'Rent Collection',    cat: 'Payments',     Diagram: DiagRentCollection },
  { name: 'Maintenance AI',     cat: 'Operations',   Diagram: DiagMaintenance },
  { name: 'Lease Renewal',      cat: 'Leasing',      Diagram: DiagLeaseRenewal },
  { name: 'Property Inspection',cat: 'Operations',   Diagram: DiagInspection },
  { name: 'Utility Billing',    cat: 'Payments',     Diagram: DiagUtilityBilling },
]

function WfCard({ name, cat, Diagram }: DiagramCard) {
  return (
    <div className="af-wf-card">
      <div className="af-wf-card-header">
        <span className="af-wf-card-name">{name}</span>
        <span className="af-wf-card-cat">{cat}</span>
      </div>
      <div className="af-wf-canvas">
        <Diagram />
      </div>
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function Home() {
  const { dark, toggle: setDark } = useTheme()
  const [authedUser, setAuthedUser] = useState<{name:string;role:string}|null>(null)
  const sparksRef = useRef<HTMLCanvasElement>(null)
  const wrapRef   = useRef<HTMLDivElement>(null)
  const svgRef    = useRef<SVGSVGElement>(null)
  const layerRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem('apt_user')
    if (stored) { try { setAuthedUser(JSON.parse(stored)) } catch { /* ignore */ } }
  }, [])

  useEffect(() => {
    const canvas = sparksRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    let W = 0, H = 0, raf = 0
    const resize = () => { const h = canvas.parentElement!; W = canvas.width = h.offsetWidth; H = canvas.height = h.offsetHeight }
    resize(); window.addEventListener('resize', resize)
    const marks = Array.from({ length: 44 }, () => ({ x: Math.random(), y: Math.random(), sz: Math.random()*5+2, phase: Math.random()*Math.PI*2, rate: Math.random()*0.35+0.15, cross: Math.random()>0.42 }))
    let t = 0
    const tick = () => {
      t += 0.014; ctx.clearRect(0,0,W,H)
      for (const m of marks) {
        const a = (Math.sin(t*m.rate+m.phase)*0.5+0.5)*0.48+0.04
        const px = m.x*W, py = m.y*H, s = m.sz*0.45
        ctx.globalAlpha = a; ctx.strokeStyle='rgba(255,255,255,0.95)'; ctx.lineWidth=0.9
        if (m.cross) { ctx.beginPath(); ctx.moveTo(px-s,py); ctx.lineTo(px+s,py); ctx.moveTo(px,py-s); ctx.lineTo(px,py+s); ctx.stroke() }
        else { ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(px,py,1.1,0,Math.PI*2); ctx.fill() }
      }
      ctx.globalAlpha=1; raf=requestAnimationFrame(tick)
    }
    raf=requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize',resize) }
  }, [])

  useEffect(() => {
    const wrap=wrapRef.current as HTMLDivElement, svg=svgRef.current as SVGSVGElement, layer=layerRef.current as HTMLDivElement
    if (!wrap||!svg||!layer) return
    const NW=106, NH=72
    type Node={id:string;label:string;type:string;emoji:string;color:string;rx:number;ry:number;x:number;y:number}
    const nodes:Node[]=[
      {id:'apply',  label:'New Tenant', type:'trigger', emoji:'👤',color:'#3b82f6',rx:0.05,ry:0.14,x:0,y:0},
      {id:'screen', label:'Screening',  type:'manual',  emoji:'🔍',color:'#f59e0b',rx:0.30,ry:0.52,x:0,y:0},
      {id:'lease',  label:'Sign Lease', type:'document',emoji:'📋',color:'#22c55e',rx:0.55,ry:0.14,x:0,y:0},
      {id:'payment',label:'Rent Setup', type:'payment', emoji:'💳',color:'#a855f7',rx:0.78,ry:0.52,x:0,y:0},
    ]
    const edges:[string,string][]=[['apply','screen'],['screen','lease'],['lease','payment']]
    let cRect:DOMRect|null=null, dragging:Node|null=null, dox=0, doy=0
    const els:Record<string,HTMLDivElement>={}, paths:Record<string,SVGPathElement>={}
    function init(){cRect=wrap.getBoundingClientRect();for(const n of nodes){n.x=n.rx*(cRect.width-NW);n.y=n.ry*(cRect.height-NH)}}
    function buildPaths(){svg.innerHTML='';const defs=document.createElementNS('http://www.w3.org/2000/svg','defs');svg.appendChild(defs);for(const[a,b]of edges){const mid=`arr-${a}-${b}`;const mk=document.createElementNS('http://www.w3.org/2000/svg','marker');mk.setAttribute('id',mid);mk.setAttribute('markerWidth','9');mk.setAttribute('markerHeight','7');mk.setAttribute('refX','8');mk.setAttribute('refY','3.5');mk.setAttribute('orient','auto');const ap=document.createElementNS('http://www.w3.org/2000/svg','path');ap.setAttribute('d','M0,0 L0,7 L9,3.5 z');ap.setAttribute('fill','#22c55e');ap.setAttribute('opacity','0.75');mk.appendChild(ap);defs.appendChild(mk);const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('class','edge-path');path.setAttribute('marker-end',`url(#${mid})`);svg.appendChild(path);paths[`${a}-${b}`]=path}}
    function updateEdge(a:string,b:string){const na=nodes.find(n=>n.id===a)!,nb=nodes.find(n=>n.id===b)!;const x1=na.x+NW,y1=na.y+NH/2,x2=nb.x,y2=nb.y+NH/2,mx=(x1+x2)/2;paths[`${a}-${b}`].setAttribute('d',`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`)}
    function updateAll(){for(const[a,b]of edges)updateEdge(a,b)}
    function buildNodes(){layer.innerHTML='';for(const n of nodes){const el=document.createElement('div');el.className='wfn';el.style.cssText=`left:${n.x}px;top:${n.y}px;`;el.innerHTML=`<div class="port port-l"></div><div class="wfn-icon" style="background:${n.color}1a">${n.emoji}</div><div class="wfn-name">${n.label}</div><div class="wfn-type">${n.type}</div><div class="port port-r"></div>`;const sd=(cx:number,cy:number)=>{dragging=n;cRect=wrap.getBoundingClientRect();dox=cx-cRect.left-n.x;doy=cy-cRect.top-n.y;el.classList.add('is-dragging')};el.addEventListener('mousedown',(e:MouseEvent)=>{e.preventDefault();sd(e.clientX,e.clientY)});el.addEventListener('touchstart',(e:TouchEvent)=>{e.preventDefault();sd(e.touches[0].clientX,e.touches[0].clientY)},{passive:false});els[n.id]=el;layer.appendChild(el)}}
    const onMM=(e:MouseEvent)=>{if(!dragging||!cRect)return;const n=dragging;n.x=Math.max(0,Math.min(cRect.width-NW,e.clientX-cRect.left-dox));n.y=Math.max(0,Math.min(cRect.height-NH,e.clientY-cRect.top-doy));els[n.id].style.left=n.x+'px';els[n.id].style.top=n.y+'px';updateAll()}
    const onTM=(e:TouchEvent)=>{if(!dragging||!cRect)return;e.preventDefault();const n=dragging,t=e.touches[0];n.x=Math.max(0,Math.min(cRect.width-NW,t.clientX-cRect.left-dox));n.y=Math.max(0,Math.min(cRect.height-NH,t.clientY-cRect.top-doy));els[n.id].style.left=n.x+'px';els[n.id].style.top=n.y+'px';updateAll()}
    const sd=()=>{if(dragging){els[dragging.id].classList.remove('is-dragging');dragging=null}}
    const onR=()=>{const old=cRect||wrap.getBoundingClientRect();cRect=wrap.getBoundingClientRect();for(const n of nodes){n.x=Math.max(0,Math.min(cRect.width-NW,(n.x/old.width)*cRect.width));n.y=Math.max(0,Math.min(cRect.height-NH,(n.y/old.height)*cRect.height));if(els[n.id]){els[n.id].style.left=n.x+'px';els[n.id].style.top=n.y+'px'}}updateAll()}
    document.addEventListener('mousemove',onMM);document.addEventListener('touchmove',onTM,{passive:false});document.addEventListener('mouseup',sd);document.addEventListener('touchend',sd);window.addEventListener('resize',onR)
    requestAnimationFrame(()=>{init();buildNodes();buildPaths();updateAll()})
    return()=>{document.removeEventListener('mousemove',onMM);document.removeEventListener('touchmove',onTM);document.removeEventListener('mouseup',sd);document.removeEventListener('touchend',sd);window.removeEventListener('resize',onR)}
  }, [])

  const features = [
    {icon:'🏢',color:'#3b82f6',title:'Properties & Units',     desc:'Manage multiple buildings, floors, and units. Track occupancy, type, and status across your entire portfolio.'},
    {icon:'👤',color:'#22c55e',title:'Owners & Landlords',     desc:'Maintain a complete record for each property owner — contacts, documents, and linked properties in one place.'},
    {icon:'📋',color:'#f97316',title:'Lease Agreements',       desc:'Create, renew, and track leases with automatic expiry alerts, security deposit tracking, and digital signing.'},
    {icon:'💳',color:'#a855f7',title:'Rent & Payments',        desc:'Record rent payments, issue receipts, flag overdue tenants, and view full payment history per unit.'},
    {icon:'🔧',color:'#f59e0b',title:'Maintenance Requests',   desc:'Tenants raise tickets; staff get assigned, update status, and close jobs — full audit trail for every request.'},
    {icon:'📊',color:'#14b8a6',title:'Finance & Reporting',    desc:'Expenses, payroll, loans, security money, taxes, and utility bills — all in one ledger with exportable reports.'},
  ]

  const checks = [
    {title:'All your buildings,',    desc:'owners, renters, and leases — managed from a single dashboard, not scattered across spreadsheets.'},
    {title:'Role-based access:',     desc:'Super Admin has full control; grant each Admin exactly the modules they need — nothing more.'},
    {title:'Real-time status',       desc:'for every lease, payment, maintenance job, and utility bill — always up to date, no manual entry.'},
  ]

  const colA = [DIAGRAMS[0], DIAGRAMS[3]]
  const colB = [DIAGRAMS[1], DIAGRAMS[4]]
  const colC = [DIAGRAMS[2], DIAGRAMS[5]]

  return (
    <>
      {/* ── Nav ── */}
      <nav className="af-nav">
        <a className="af-nav-logo" href="/">
          <div className="af-nav-icon">AP</div>
          Apartment
        </a>
        <ul className="af-nav-links">
          {['Product','Use Cases','Docs','Pricing','Enterprise'].map(l => (
            <li key={l}><a href="#">{l}</a></li>
          ))}
        </ul>
        <div className="af-nav-right">
          <a className="af-nav-badge" href="#">
            <span className="af-star">★</span> 12,840
          </a>
          {authedUser ? (
            <>
              <span style={{fontSize:12.5,color:'var(--muted)',fontWeight:500}}>
                {authedUser.name.split(' ')[0]}
              </span>
              <a className="af-nav-cta" href="/dashboard">Dashboard</a>
            </>
          ) : (
            <a className="af-nav-cta" href="/login">Sign in</a>
          )}
          <button className="af-theme-btn" onClick={() => setDark()} aria-label="Toggle theme">
            {dark ? '🌙' : '☀️'}
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="af-hero">
        <div className="af-hero-bg" />
        <canvas ref={sparksRef} className="af-sparks" />
        <div className="af-hero-inner">
          <div className="af-hero-text">
            <div className="af-pill">Property Management Platform</div>
            <h1 className="af-h1">
              Your entire building,<br />one<br />
              <em>connected</em> dashboard
            </h1>
            <p className="af-sub">
              Apartment replaces your scattered spreadsheets and paper leases with one
              system — properties, tenants, payments, maintenance, and payroll, all linked together.
            </p>
            <ul className="af-bullets">
              <li><strong>Onboard a new tenant end-to-end</strong> — screening, lease signing, rent setup, security deposit — without switching tools.</li>
              <li><strong>Collect and track rent</strong> for every unit, flag overdue payments, and issue receipts automatically.</li>
              <li><strong>Manage maintenance, utilities, loans, and payroll</strong> from the same dashboard your whole team uses.</li>
            </ul>
            <div className="af-actions">
              <a className="af-btn-primary" href="/login">
                Sign in
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                  <path d="M2 6.5h9M8 3l3.5 3.5L8 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          </div>

          <div className="af-node-wrap" ref={wrapRef}>
            <svg ref={svgRef} className="af-conn-svg" aria-hidden="true" />
            <div ref={layerRef} className="af-node-layer" />
            <div className="af-canvas-label">drag any node to rearrange</div>
          </div>
        </div>
      </section>

      {/* ── Sliding workflow diagrams ── */}
      <section className="af-wf-section">
        <div className="af-wf-header">
          <div className="af-eyebrow">How it works</div>
          <h2 className="af-wf-h2">
            Every task<br/>has a clear flow
          </h2>
          <p className="af-wf-desc">
            From tenant onboarding and lease renewal to rent collection and maintenance — each process is mapped out and trackable in real time.
          </p>
          <a className="af-btn-primary" href="/login" style={{alignSelf:'flex-start',marginTop:8}}>
            Sign in
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M2 6.5h9M8 3l3.5 3.5L8 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>
        <div className="af-wf-stage">
          <div className="af-wf-col af-wf-col-a">
            {[...colA, ...colA].map((d, i) => <WfCard key={`a${i}`} {...d} />)}
          </div>
          <div className="af-wf-col af-wf-col-b">
            {[...colB, ...colB].map((d, i) => <WfCard key={`b${i}`} {...d} />)}
          </div>
          <div className="af-wf-col af-wf-col-c">
            {[...colC, ...colC].map((d, i) => <WfCard key={`c${i}`} {...d} />)}
          </div>
        </div>
      </section>

      {/* ── Move fast ── */}
      <section className="af-break">
        <h2>One system.<br />Zero spreadsheets.</h2>
        <p>Everything a property management team needs — in a single connected platform.</p>
        <div className="af-break-checks">
          {checks.map((c, i) => (
            <div key={i} className="af-break-check">
              <div className="af-check-icon">✓</div>
              <div><strong>{c.title}</strong> {c.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="af-features">
        <div className="af-feat-header">
          <div className="af-eyebrow">Built for property teams</div>
          <h2>Everything in one connected place</h2>
          <p>From owner onboarding to tenant exit — every part of running a building is covered. No extra tools, no data re-entry.</p>
        </div>
        <div className="af-feat-grid">
          {features.map((f, i) => (
            <div key={i} className="af-feat-card">
              <div className="af-feat-icon" style={{background:`${f.color}1a`}}>{f.icon}</div>
              <div className="af-feat-title">{f.title}</div>
              <div className="af-feat-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
