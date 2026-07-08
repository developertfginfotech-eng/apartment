'use client'

import { useEffect, useRef } from 'react'

interface SparkleFieldProps {
  className?: string
  count?: number
  /** Adapt particle color to the current light/dark theme instead of always using white
   *  (use this when the container's own background also follows the theme). */
  themed?: boolean
}

export default function SparkleField({ className, count = 44, themed = false }: SparkleFieldProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    let W = 0, H = 0, raf = 0
    const resize = () => { const h = canvas.parentElement!; W = canvas.width = h.offsetWidth; H = canvas.height = h.offsetHeight }
    resize(); window.addEventListener('resize', resize)

    const marks = Array.from({ length: count }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random()-0.5)*0.00028, vy: (Math.random()-0.5)*0.00028,
      wobPhase: Math.random()*Math.PI*2, wobRate: Math.random()*0.2+0.08, wobAmp: Math.random()*0.012+0.004,
      sz: Math.random()*9+5, phase: Math.random()*Math.PI*2, rate: Math.random()*0.35+0.15, cross: Math.random()>0.42,
    }))
    let t = 0
    const tick = () => {
      t += 0.014; ctx.clearRect(0,0,W,H)
      const isLight = themed && document.documentElement.getAttribute('data-theme') === 'light'
      const stroke = isLight ? 'rgba(20,22,45,0.55)' : 'rgba(255,255,255,0.95)'
      const fill   = isLight ? 'rgba(20,22,45,0.5)'  : 'rgba(255,255,255,0.9)'
      for (const m of marks) {
        // slow drift, wrapping around the edges, plus a gentle perpendicular wobble for organic float
        m.x = (m.x + m.vx + 1) % 1
        m.y = (m.y + m.vy + 1) % 1
        const wob = Math.sin(t*m.wobRate+m.wobPhase)*m.wobAmp
        const a = (Math.sin(t*m.rate+m.phase)*0.5+0.5)*0.48+0.04
        const px = (m.x+wob)*W, py = m.y*H, s = m.sz*0.85
        ctx.globalAlpha = a; ctx.strokeStyle = stroke; ctx.lineWidth = 1.6
        if (m.cross) { ctx.beginPath(); ctx.moveTo(px-s,py); ctx.lineTo(px+s,py); ctx.moveTo(px,py-s); ctx.lineTo(px,py+s); ctx.stroke() }
        else { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(px,py,s*0.4,0,Math.PI*2); ctx.fill() }
      }
      ctx.globalAlpha = 1; raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [count, themed])

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  )
}
