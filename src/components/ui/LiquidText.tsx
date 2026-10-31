import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react'

// Hovering ripples the text like liquid: an SVG turbulence field displaces the letters, and the effect eases back
// to perfectly still type when the pointer leaves. The filter is only attached while it is moving, so it costs
// nothing at rest; it is skipped for touch screens and for people who prefer reduced motion.
export function LiquidText({ children, className, style, strength = 34 }: {
  children: ReactNode; className?: string; style?: CSSProperties; strength?: number
}) {
  const id = `liquid${useId().replace(/:/g, '')}`
  const host = useRef<HTMLDivElement>(null)
  const turb = useRef<SVGFETurbulenceElement>(null)
  const disp = useRef<SVGFEDisplacementMapElement>(null)

  useEffect(() => {
    const el = host.current
    if (!el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let active = false, scale = 0, t = 0, raf = 0, last = { x: 0, y: 0 }, energy = 0
    const frame = () => {
      t += 0.012
      const target = active ? strength * (0.55 + Math.min(energy, 1) * 0.45) : 0
      scale += (target - scale) * 0.08
      energy *= 0.94
      turb.current?.setAttribute('baseFrequency', `${(0.022 + Math.sin(t) * 0.004).toFixed(4)} ${(0.006 + Math.cos(t * 0.7) * 0.002).toFixed(4)}`)
      disp.current?.setAttribute('scale', scale.toFixed(2))
      if (!active && scale < 0.3) {
        el.style.filter = ''
        disp.current?.setAttribute('scale', '0')
        raf = 0
        return
      }
      raf = requestAnimationFrame(frame)
    }
    const start = () => {
      el.style.filter = `url(#${id})`
      if (!raf) raf = requestAnimationFrame(frame)
    }
    const enter = (e: PointerEvent) => { active = true; last = { x: e.clientX, y: e.clientY }; start() }
    const move = (e: PointerEvent) => {
      energy += Math.hypot(e.clientX - last.x, e.clientY - last.y) / 120
      last = { x: e.clientX, y: e.clientY }
    }
    const leave = () => { active = false }
    el.addEventListener('pointerenter', enter)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointerenter', enter)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      cancelAnimationFrame(raf)
    }
  }, [id, strength])

  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence ref={turb} type="fractalNoise" baseFrequency="0.022 0.006" numOctaves="2" seed="4" result="noise" />
          <feDisplacementMap ref={disp} in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div ref={host} className={className} style={{ willChange: 'filter', ...style }} data-cursor="hover">
        {children}
      </div>
    </>
  )
}
