import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const PARTICLES = Array.from({ length: 25 }, (_, i) => ({
  x: `${(i * 17 + 5) % 97}%`,
  y: `${(i * 23 + 8) % 94}%`,
  size: 2 + (i % 3),
  dur: 2.5 + (i % 4) * 0.7,
  delay: i * 0.12,
}))

const BgParticles = () => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
    {PARTICLES.map((p, i) => (
      <motion.div
        key={i}
        style={{
          position: 'absolute',
          left: p.x, top: p.y,
          width: p.size, height: p.size,
          borderRadius: '50%',
          background: i % 3 === 0 ? '#3b82f6' : i % 3 === 1 ? '#60a5fa' : '#818cf8',
        }}
        animate={{ y: [-15, 15, -15], opacity: [0.1, 0.5, 0.1], scale: [1, 1.4, 1] }}
        transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
      />
    ))}
    {/* Ambient glow orbs */}
    <motion.div
      animate={{ scale: [1, 1.2, 1], opacity: [0.06, 0.12, 0.06] }}
      transition={{ duration: 4, repeat: Infinity }}
      style={{
        position: 'absolute', width: '500px', height: '500px',
        borderRadius: '50%', top: '-150px', left: '-100px',
        background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)',
      }}
    />
    <motion.div
      animate={{ scale: [1, 1.15, 1], opacity: [0.05, 0.1, 0.05] }}
      transition={{ duration: 5, repeat: Infinity, delay: 1.5 }}
      style={{
        position: 'absolute', width: '400px', height: '400px',
        borderRadius: '50%', bottom: '-100px', right: '-80px',
        background: 'radial-gradient(circle, #818cf8 0%, transparent 70%)',
      }}
    />
  </div>
)

const RING_CONFIG = [
  { inset: 0,  color: '#3b82f6', color2: 'transparent', dur: 0.9,  dir: 1,  width: 2 },
  { inset: 16, color: '#60a5fa', color2: '#818cf8',     dur: 1.4,  dir: -1, width: 2 },
  { inset: 32, color: '#93c5fd', color2: 'transparent', dur: 1.9,  dir: 1,  width: 1.5 },
  { inset: 46, color: '#bfdbfe', color2: 'transparent', dur: 2.8,  dir: -1, width: 1 },
]

export const LoadingScreen = ({ onDone }: { onDone: () => void }) => {
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState(0) // 0=loading, 1=name reveal, 2=exit
  const onDoneRef = useRef(onDone)
  const firedRef = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); return 100 }
        return p + 2
      })
    }, 20)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (progress === 100 && !firedRef.current) {
      firedRef.current = true
      const t1 = setTimeout(() => setPhase(1), 200)
      const t2 = setTimeout(() => setPhase(2), 2400)
      const t3 = setTimeout(() => onDoneRef.current(), 3000)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    }
  }, [progress])

  const letters = 'Manikandan Santhosh'.split('')

  return (
    <AnimatePresence>
      {phase < 2 && (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.08 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: '#020817',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '30px',
          }}
        >
          <BgParticles />

          {/* 4-ring spinner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'backOut' }}
            style={{ position: 'relative', width: '150px', height: '150px', flexShrink: 0 }}
          >
            {RING_CONFIG.map((r, i) => (
              <motion.div
                key={i}
                animate={{ rotate: r.dir === 1 ? 360 : -360 }}
                transition={{ duration: r.dur, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  inset: `${r.inset}px`,
                  borderRadius: '50%',
                  border: `${r.width}px solid transparent`,
                  borderTopColor: r.color,
                  borderRightColor: r.color2,
                  filter: i < 2 ? `drop-shadow(0 0 6px ${r.color}88)` : 'none',
                }}
              />
            ))}
            {/* Center glow orb */}
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              style={{
                position: 'absolute', inset: '52px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, #93c5fd, #2563eb)',
                boxShadow: '0 0 25px #3b82f6, 0 0 50px rgba(59,130,246,0.4), 0 0 80px rgba(59,130,246,0.15)',
              }}
            />
            {/* Orbiting dot */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              style={{ position: 'absolute', inset: '12px' }}
            >
              <div style={{
                width: '7px', height: '7px',
                borderRadius: '50%',
                background: '#60a5fa',
                boxShadow: '0 0 12px #3b82f6',
                position: 'absolute',
                top: '0', left: '50%',
                transform: 'translateX(-50%)',
              }} />
            </motion.div>
          </motion.div>

          {/* Name reveal zone */}
          <div style={{ height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {phase === 1 ? (
              <motion.div
                style={{ display: 'flex', flexWrap: 'nowrap', whiteSpace: 'nowrap', gap: '2px' }}
                initial="hidden"
                animate="visible"
              >
                {letters.map((l, i) => (
                  <motion.span
                    key={i}
                    variants={{
                      hidden: { opacity: 0, y: 40, scale: 0.4, rotateX: -90 },
                      visible: {
                        opacity: 1, y: 0, scale: 1, rotateX: 0,
                        transition: {
                          delay: i * 0.055,
                          type: 'spring',
                          stiffness: 320,
                          damping: 22,
                          mass: 0.7,
                        },
                      },
                    }}
                    style={{
                      fontFamily: '"Dancing Script", cursive',
                      fontSize: 'clamp(1.7rem, 3.8vw, 2.8rem)',
                      fontWeight: 700,
                      color: l === ' ' ? 'transparent' : '#93c5fd',
                      display: 'inline-block',
                      width: l === ' ' ? '12px' : 'auto',
                      verticalAlign: 'baseline',
                      textShadow: l !== ' ' ? '0 0 15px rgba(147,197,253,0.8), 0 0 35px rgba(59,130,246,0.5)' : 'none',
                    }}
                  >
                    {l}
                  </motion.span>
                ))}
              </motion.div>
            ) : (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.5, 0.3, 0.6, 0.4] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                style={{ color: '#1e3a5f', fontSize: '0.78rem', letterSpacing: '5px', textTransform: 'uppercase' }}
              >
                Initializing...
              </motion.p>
            )}
          </div>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ width: '280px' }}
          >
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' }}>
              <motion.div
                style={{
                  height: '100%',
                  borderRadius: '2px',
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #1d4ed8, #3b82f6, #60a5fa, #93c5fd)',
                  backgroundSize: '200% 100%',
                  boxShadow: '0 0 12px rgba(59,130,246,0.7)',
                }}
                animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                transition={{ backgroundPosition: { duration: 2, repeat: Infinity }, width: { ease: 'linear' } }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#1e3a5f', fontSize: '0.68rem', letterSpacing: '3px', textTransform: 'uppercase' }}>
                {progress < 100 ? 'Loading Portfolio' : 'Welcome'}
              </span>
              <motion.span
                style={{ color: '#3b82f6', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'monospace' }}
                animate={{ opacity: progress < 100 ? [1, 0.4, 1] : 1 }}
                transition={{ duration: 0.7, repeat: progress < 100 ? Infinity : 0 }}
              >
                {progress}%
              </motion.span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
