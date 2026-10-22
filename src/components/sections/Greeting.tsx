import { useEffect, useState } from 'react'
import { GithubIcon, LinkedinIcon } from '@/components/ui/SocialIcons'
import { Mail, MapPin } from 'lucide-react'
import { portfolioData } from '@/data/portfolio'
import { motion } from 'framer-motion'

// ── Subtle background — precise dot grid + gradient blobs ──────────
const PARTICLES = [
  { x: '7%',  y: '22%', size: 4, dur: 4.2, delay: 0 },
  { x: '18%', y: '72%', size: 2.5, dur: 5.5, delay: 0.6 },
  { x: '33%', y: '12%', size: 5, dur: 3.8, delay: 1.1 },
  { x: '52%', y: '85%', size: 3, dur: 4.8, delay: 0.3 },
  { x: '74%', y: '18%', size: 4, dur: 6.0, delay: 0.9 },
  { x: '88%', y: '55%', size: 2.5, dur: 5.0, delay: 1.4 },
  { x: '93%', y: '30%', size: 3, dur: 4.0, delay: 0.5 },
  { x: '62%', y: '92%', size: 2, dur: 3.5, delay: 0.8 },
]

const HeroBackground = () => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
    <motion.div
      animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
      transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', top: '-200px', left: '-150px', background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)' }}
    />
    <motion.div
      animate={{ x: [0, -25, 0], y: [0, 35, 0], scale: [1, 1.12, 1] }}
      transition={{ duration: 11, repeat: Infinity, delay: 2, ease: 'easeInOut' }}
      style={{ position: 'absolute', width: '450px', height: '450px', borderRadius: '50%', bottom: '-80px', right: '-100px', background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)' }}
    />
    {PARTICLES.map((p, i) => (
      <motion.div key={i}
        style={{ position: 'absolute', left: p.x, top: p.y, width: p.size, height: p.size, borderRadius: '50%', background: i % 2 === 0 ? 'var(--primary)' : 'rgba(99,102,241,0.8)' }}
        animate={{ y: [-10, 10, -10], opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
      />
    ))}
  </div>
)

// ── AI Core Animation (unchanged — it's distinctive and good) ───────
const TECH = [
  { label: 'Python',  color: '#3b82f6' },
  { label: 'FastAPI', color: '#10b981' },
  { label: 'LLMs',    color: '#818cf8' },
  { label: 'React',   color: '#38bdf8' },
  { label: 'TypeScript', color: '#60a5fa' },
  { label: 'Node.js', color: '#f59e0b' },
  { label: 'Gemini',  color: '#a78bfa' },
  { label: 'Postgres', color: '#34d399' },
]

const AiCoreAnimation = () => (
  <div style={{ position: 'relative', width: 'clamp(280px, 88vw, 420px)', height: 'clamp(280px, 88vw, 420px)' }}>
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06, pointerEvents: 'none' }}>
      {Array.from({ length: 11 }, (_, row) =>
        Array.from({ length: 11 }, (_, col) => (
          <circle key={`${row}-${col}`} cx={col * 42} cy={row * 42} r="1.5" fill="#3b82f6" />
        ))
      )}
    </svg>
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 25, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <svg width="100%" height="100%" viewBox="0 0 420 420"><circle cx="210" cy="210" r="204" stroke="rgba(59,130,246,0.1)" strokeWidth="1.5" fill="none" strokeDasharray="4 16" /></svg>
    </motion.div>
    <motion.div animate={{ rotate: -360 }} transition={{ duration: 35, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <svg width="100%" height="100%" viewBox="0 0 420 420"><circle cx="210" cy="210" r="192" stroke="rgba(129,140,248,0.07)" strokeWidth="1" fill="none" strokeDasharray="2 20" /></svg>
    </motion.div>
    <motion.div animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.9, 1.08, 0.9] }} transition={{ duration: 3.5, repeat: Infinity }} style={{ position: 'absolute', inset: '70px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.25) 0%, transparent 70%)', filter: 'blur(18px)', pointerEvents: 'none' }} />
    {[0, 1, 2].map(i => (
      <motion.div key={i} animate={{ scale: [0.35, 2.4], opacity: [0.6, 0] }} transition={{ duration: 3.8, repeat: Infinity, delay: i * 1.25, ease: 'easeOut' }}
        style={{ position: 'absolute', top: '50%', left: '50%', width: '88px', height: '88px', borderRadius: '50%', border: '1.5px solid #3b82f6', marginLeft: '-44px', marginTop: '-44px', pointerEvents: 'none' }}
      />
    ))}
    <div style={{ position: 'absolute', top: '50%', left: '50%', width: '210px', height: '210px', marginLeft: '-105px', marginTop: '-105px', borderRadius: '50%', border: '1.5px solid rgba(59,130,246,0.4)', transform: 'perspective(480px) rotateX(72deg)' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', inset: 0, borderRadius: '50%' }}>
        <div style={{ position: 'absolute', top: '-7px', left: '50%', marginLeft: '-7px', width: '14px', height: '14px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 16px #3b82f6, 0 0 36px rgba(59,130,246,0.5)' }} />
      </motion.div>
    </div>
    <div style={{ position: 'absolute', top: '50%', left: '50%', width: '300px', height: '300px', marginLeft: '-150px', marginTop: '-150px', borderRadius: '50%', border: '1.5px solid rgba(96,165,250,0.28)', transform: 'perspective(480px) rotateX(72deg) rotateZ(60deg)' }}>
      <motion.div animate={{ rotate: -360 }} transition={{ duration: 5.5, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', inset: 0, borderRadius: '50%' }}>
        <div style={{ position: 'absolute', top: '-8px', left: '50%', marginLeft: '-8px', width: '16px', height: '16px', borderRadius: '50%', background: '#60a5fa', boxShadow: '0 0 18px #60a5fa, 0 0 40px rgba(96,165,250,0.4)' }} />
      </motion.div>
    </div>
    <div style={{ position: 'absolute', top: '50%', left: '50%', width: '376px', height: '376px', marginLeft: '-188px', marginTop: '-188px', borderRadius: '50%', border: '1.5px solid rgba(129,140,248,0.18)', transform: 'perspective(480px) rotateX(72deg) rotateZ(120deg)' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 8.5, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', inset: 0, borderRadius: '50%' }}>
        <div style={{ position: 'absolute', top: '-5px', left: '50%', marginLeft: '-5px', width: '10px', height: '10px', borderRadius: '50%', background: '#818cf8', boxShadow: '0 0 14px #818cf8, 0 0 28px rgba(129,140,248,0.4)' }} />
      </motion.div>
    </div>
    <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2.5, repeat: Infinity }}
      style={{ position: 'absolute', top: '50%', left: '50%', width: '92px', height: '92px', marginLeft: '-46px', marginTop: '-46px', borderRadius: '50%', background: 'radial-gradient(circle at 32% 28%, #bfdbfe, #2563eb, #1e3a8a)', boxShadow: '0 0 28px #3b82f6, 0 0 60px rgba(59,130,246,0.45), 0 0 100px rgba(59,130,246,0.18)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <span style={{ color: 'white', fontWeight: 900, fontSize: '1rem', letterSpacing: '1px', fontFamily: '"JetBrains Mono", monospace', textShadow: '0 0 10px rgba(255,255,255,0.6)' }}>AI</span>
    </motion.div>
    {TECH.map((tech, i) => {
      const angle = (i / TECH.length) * 2 * Math.PI - Math.PI / 2
      const r = 148 + (i % 3) * 20
      const x = Math.cos(angle) * r
      const y = Math.sin(angle) * r * 0.72
      return (
        <div key={tech.label} style={{ position: 'absolute', left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, transform: 'translate(-50%, -50%)', zIndex: 6 }}>
          <motion.div
            animate={{ y: [-4, 4, -4], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.8 + i * 0.32, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
            style={{ background: 'rgba(5, 10, 25, 0.88)', border: `1px solid ${tech.color}45`, borderRadius: '30px', padding: '4px 12px', color: tech.color, fontSize: '0.65rem', fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', whiteSpace: 'nowrap', boxShadow: `0 4px 16px ${tech.color}20` }}
          >
            {tech.label}
          </motion.div>
        </div>
      )
    })}
  </div>
)

// ── Typewriter hook ─────────────────────────────────────────────────
const useTypewriter = (text: string, startDelay = 600, speed = 22) => {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    const t = setTimeout(() => {
      let i = 0
      const interval = setInterval(() => {
        setDisplayed(text.slice(0, i + 1))
        i++
        if (i >= text.length) clearInterval(interval)
      }, speed)
      return () => clearInterval(interval)
    }, startDelay)
    return () => clearTimeout(t)
  }, [text, startDelay, speed])
  return displayed
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 90, damping: 18 } },
}

// ── Component ───────────────────────────────────────────────────────
export const Greeting = () => {
  const { subTitle, resumeLink, socialLinks, location, openToOpportunities } = portfolioData
  const typedText = useTypewriter(subTitle, 700, 20)

  return (
    <section
      id="greeting"
      style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: 'clamp(80px, 12vw, 100px) 0 60px', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}
    >
      <HeroBackground />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', width: '100%', position: 'relative', zIndex: 1 }}>
        <div className="grid-2col">

          {/* Left: text */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible">

            {/* Role label — monospace, precise */}
            <motion.span
              variants={itemVariants}
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.72rem',
                fontWeight: 500,
                color: 'var(--primary)',
                textTransform: 'uppercase',
                letterSpacing: '3px',
                display: 'block',
                marginBottom: '1rem',
              }}
            >
              AI Systems Engineer
            </motion.span>

            {/* Name — Inter ExtraBold, no decorative font */}
            <motion.h1
              variants={itemVariants}
              style={{
                fontFamily: '"Inter", -apple-system, sans-serif',
                fontSize: 'clamp(2.6rem, 6vw, 4.2rem)',
                fontWeight: 900,
                color: 'var(--text)',
                lineHeight: 1.08,
                letterSpacing: '-0.025em',
                marginBottom: '1.5rem',
              }}
            >
              Manikandan<br />Santhosh
            </motion.h1>

            {/* Typewriter description */}
            <motion.p
              variants={itemVariants}
              style={{ fontSize: '0.97rem', color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: '1.75rem', maxWidth: '480px', minHeight: '5rem' }}
            >
              {typedText}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.55, repeat: Infinity, repeatType: 'reverse' }}
                style={{ display: 'inline-block', width: '2px', height: '1em', background: 'var(--primary)', marginLeft: '2px', verticalAlign: 'text-bottom', borderRadius: '1px' }}
              />
            </motion.p>

            {/* Location + availability */}
            <motion.div
              variants={itemVariants}
              style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.75rem', flexWrap: 'wrap' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                <MapPin size={13} /> {location}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: openToOpportunities ? '#22c55e' : '#ef4444' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'currentColor', display: 'inline-block', flexShrink: 0 }} />
                {openToOpportunities ? 'Open to opportunities' : 'Not available'}
              </span>
            </motion.div>

            {/* Social icons */}
            <motion.div variants={itemVariants} style={{ display: 'flex', gap: '10px', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
              {socialLinks.map((s) => (
                <motion.a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  className="social-btn" style={{ background: s.bg }} title={s.label}
                  aria-label={s.label}
                  whileHover={{ scale: 1.12, y: -3 }} whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {s.icon === 'github' && <GithubIcon size={18} />}
                  {s.icon === 'linkedin' && <LinkedinIcon size={18} />}
                  {s.icon === 'mail' && <Mail size={18} />}
                </motion.a>
              ))}
            </motion.div>

            {/* CTA buttons */}
            <motion.div variants={itemVariants} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <motion.a href="#contact" className="btn-primary"
                whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                Get In Touch
              </motion.a>
              <motion.a href={resumeLink} target="_blank" rel="noopener noreferrer" className="btn-secondary"
                whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                View Resume
              </motion.a>
            </motion.div>
          </motion.div>

          {/* Right: AI core animation */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.25, type: 'spring', stiffness: 80, damping: 18 }}
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
            <AiCoreAnimation />
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8 }}
        style={{
          position: 'absolute', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
          color: 'var(--text-secondary)', fontSize: '0.65rem', letterSpacing: '2.5px', textTransform: 'uppercase',
          fontFamily: '"JetBrains Mono", monospace',
        }}
      >
        <span>Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          style={{ width: '18px', height: '28px', border: '1.5px solid var(--text-secondary)', borderRadius: '9px', position: 'relative', opacity: 0.6 }}
        >
          <motion.div
            animate={{ y: [2, 10, 2], opacity: [1, 0, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--primary)', position: 'absolute', left: '50%', top: '4px', transform: 'translateX(-50%)' }}
          />
        </motion.div>
      </motion.div>
    </section>
  )
}
