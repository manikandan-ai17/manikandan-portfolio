import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { EASE } from '@/lib/motion'

// Opening sequence: a counter runs to 100%, "hello" is written by hand, then a turquoise cross opens over the
// screen and lifts away to reveal the page. Shown once per visit; a click or key press skips it.

type Phase = 'count' | 'hello' | 'wipe'

// Twelve-point polygons: a small cross, a cross whose arms reach the edges, and the full screen.
const CROSS = [
  'polygon(48% 47%, 52% 47%, 52% 49%, 54% 49%, 54% 51%, 52% 51%, 52% 53%, 48% 53%, 48% 51%, 46% 51%, 46% 49%, 48% 49%)',
  'polygon(38% 0%, 62% 0%, 62% 38%, 100% 38%, 100% 62%, 62% 62%, 62% 100%, 38% 100%, 38% 62%, 0% 62%, 0% 38%, 38% 38%)',
  'polygon(0% 0%, 100% 0%, 100% 0%, 100% 0%, 100% 100%, 100% 100%, 100% 100%, 0% 100%, 0% 100%, 0% 100%, 0% 0%, 0% 0%)',
]

export function Loader({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion()
  const [pct, setPct] = useState(0)
  const [phase, setPhase] = useState<Phase>('count')
  const [leaving, setLeaving] = useState(false)

  // Counter: eases toward 100, a little faster once fonts and the page are ready.
  useEffect(() => {
    if (reduce) {
      const t = setTimeout(onDone, 350)
      return () => clearTimeout(t)
    }
    let ready = false
    Promise.all([document.fonts?.ready, new Promise((r) => (document.readyState === 'complete' ? r(null) : window.addEventListener('load', r, { once: true })))]).then(() => (ready = true))
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (ready ? 1400 : 2200))
      const eased = 1 - Math.pow(1 - t, 3)
      setPct(Math.round(eased * 100))
      if (t < 1) raf = requestAnimationFrame(tick)
      else setTimeout(() => setPhase('hello'), 180)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduce, onDone])

  useEffect(() => {
    if (phase === 'hello') {
      const t = setTimeout(() => setPhase('wipe'), 1500)
      return () => clearTimeout(t)
    }
    if (phase === 'wipe') {
      const a = setTimeout(() => setLeaving(true), 750)
      const b = setTimeout(onDone, 1450)
      return () => { clearTimeout(a); clearTimeout(b) }
    }
  }, [phase, onDone])

  // Skip on click / key press
  useEffect(() => {
    const skip = () => onDone()
    window.addEventListener('keydown', skip)
    return () => window.removeEventListener('keydown', skip)
  }, [onDone])

  if (reduce) return <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'var(--bg)' }} aria-hidden="true" />

  const r = 26
  const c = 2 * Math.PI * r

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Loading ${pct}%`}
      onClick={onDone}
      style={{ position: 'fixed', inset: 0, zIndex: 400, pointerEvents: leaving ? 'none' : 'auto', cursor: 'pointer' }}
    >
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ duration: 0 }}
        style={{ position: 'absolute', inset: 0, background: '#05070a', display: 'grid', placeItems: 'center' }}
      >
        <AnimatePresence mode="wait">
          {phase === 'count' && (
            <motion.div key="count" exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35, ease: EASE }} style={{ display: 'grid', justifyItems: 'center', gap: 14 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(3rem, 8vw, 5.5rem)', lineHeight: 1, color: '#e8ecef', fontVariantNumeric: 'tabular-nums' }}>
                {pct}<span style={{ color: '#2de2d0' }}>%</span>
              </div>
              <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(232,236,239,0.12)" strokeWidth="3" />
                <circle cx="32" cy="32" r={r} fill="none" stroke="#2de2d0" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 32 32)" />
              </svg>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#66717c' }}>Manikandan Santhosh</span>
            </motion.div>
          )}
          {phase !== 'count' && (
            <motion.svg key="hello" viewBox="0 0 600 260" style={{ width: 'min(78vw, 560px)', height: 'auto', overflow: 'visible' }} aria-hidden="true" exit={{ opacity: 0 }}>
              <motion.text
                x="50%" y="62%" textAnchor="middle"
                style={{ fontFamily: 'var(--font-script)', fontSize: 230 }}
                fill="transparent" stroke="#2de2d0" strokeWidth={1.6}
                strokeDasharray="1600" initial={{ strokeDashoffset: 1600, fill: 'rgba(232,236,239,0)' }}
                animate={{ strokeDashoffset: 0, fill: 'rgba(232,236,239,1)' }}
                transition={{ strokeDashoffset: { duration: 1.25, ease: 'easeInOut' }, fill: { duration: 0.5, delay: 0.95 } }}
              >
                hello
              </motion.text>
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.div>

      {/* The turquoise cross: grows from the centre, fills the screen, then lifts away to reveal the page */}
      {phase === 'wipe' && (
        <motion.div
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, background: '#2de2d0', zIndex: 2 }}
          initial={{ clipPath: CROSS[0], y: '0%' }}
          animate={leaving ? { clipPath: CROSS[2], y: '-100%' } : { clipPath: CROSS }}
          transition={leaving ? { duration: 0.7, ease: EASE } : { duration: 0.75, times: [0, 0.55, 1], ease: 'easeInOut' }}
        />
      )}
    </div>
  )
}
