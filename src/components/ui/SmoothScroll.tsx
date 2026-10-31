import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import Lenis from 'lenis'

// Smooth scrolling with Lenis, plus in-page anchor links that scroll smoothly too.
// Turned off for people who ask the system for reduced motion.

type ScrollTo = (target: string | number | HTMLElement, opts?: { offset?: number; immediate?: boolean }) => void
const ScrollContext = createContext<{ scrollTo: ScrollTo; stop: () => void; start: () => void }>({
  scrollTo: (t) => {
    const el = typeof t === 'string' ? document.querySelector(t) : t
    if (typeof el === 'number') window.scrollTo({ top: el, behavior: 'smooth' })
    else el?.scrollIntoView({ behavior: 'smooth' })
  },
  stop: () => {},
  start: () => {},
})

export const useSmoothScroll = () => useContext(ScrollContext)

export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenis = useRef<Lenis | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const l = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), touchMultiplier: 1.4 })
    lenis.current = l
    let raf = 0
    const loop = (time: number) => {
      l.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      l.destroy()
      lenis.current = null
    }
  }, [])

  // In-page links (#about …) scroll smoothly and leave the URL clean.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return
      const id = a.getAttribute('href')!
      const el = id.length > 1 ? document.querySelector(id) : null
      if (!el) return
      e.preventDefault()
      if (lenis.current) lenis.current.scrollTo(el as HTMLElement, { offset: 0 })
      else el.scrollIntoView({ behavior: 'smooth' })
      ;(el as HTMLElement).focus?.({ preventScroll: true })
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  const value = {
    scrollTo: ((target, opts) => {
      if (lenis.current) return lenis.current.scrollTo(target as never, opts)
      const el = typeof target === 'string' ? document.querySelector(target) : target
      if (typeof el === 'number') window.scrollTo({ top: el, behavior: opts?.immediate ? 'auto' : 'smooth' })
      else (el as HTMLElement | null)?.scrollIntoView({ behavior: opts?.immediate ? 'auto' : 'smooth' })
    }) as ScrollTo,
    stop: () => lenis.current?.stop(),
    start: () => lenis.current?.start(),
  }

  return <ScrollContext.Provider value={value}>{children}</ScrollContext.Provider>
}
