import { useEffect, useRef } from 'react'

// A small dot that follows the pointer and a ring that trails it and grows over links and buttons.
// Only on devices with a fine pointer; the system cursor stays visible, so nothing is hidden from anyone.
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let x = -100, y = -100, rx = -100, ry = -100, raf = 0
    const move = (e: PointerEvent) => {
      x = e.clientX
      y = e.clientY
      const hit = (e.target as HTMLElement).closest('a, button, [data-cursor="hover"], input, textarea, select')
      ring.current?.classList.toggle('is-hover', Boolean(hit))
      dot.current?.classList.remove('is-hidden')
      ring.current?.classList.remove('is-hidden')
    }
    const leave = () => {
      dot.current?.classList.add('is-hidden')
      ring.current?.classList.add('is-hidden')
    }
    const tick = () => {
      rx += (x - rx) * (reduce ? 1 : 0.18)
      ry += (y - ry) * (reduce ? 1 : 0.18)
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <div ref={ring} className="cursor-ring is-hidden" aria-hidden="true" />
      <div ref={dot} className="cursor-dot is-hidden" aria-hidden="true" />
    </>
  )
}
