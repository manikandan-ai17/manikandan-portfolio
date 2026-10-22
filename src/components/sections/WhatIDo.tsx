import { portfolioData } from '@/data/portfolio'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

// ── Syntax-highlighted code lines ──────────────────────────────────
type Token = { t: string; c: string }

const CODE: { tokens: Token[] }[] = [
  { tokens: [{ t: '# CAD drawing analysis agent', c: '#4b5563' }] },
  { tokens: [{ t: 'from ', c: '#c084fc' }, { t: 'fastapi ', c: '#e2e8f0' }, { t: 'import ', c: '#c084fc' }, { t: 'FastAPI', c: '#38bdf8' }] },
  { tokens: [{ t: 'from ', c: '#c084fc' }, { t: 'cad_agent.analyze ', c: '#e2e8f0' }, { t: 'import ', c: '#c084fc' }, { t: 'analyse_document', c: '#38bdf8' }] },
  { tokens: [] },
  { tokens: [{ t: 'app ', c: '#e2e8f0' }, { t: '= ', c: '#94a3b8' }, { t: 'FastAPI(', c: '#fbbf24' }, { t: 'title=', c: '#e2e8f0' }, { t: '"CAD Drawing Analysis Agent"', c: '#4ade80' }, { t: ')', c: '#fbbf24' }] },
  { tokens: [] },
  { tokens: [{ t: '@', c: '#f97316' }, { t: 'app', c: '#60a5fa' }, { t: '.post(', c: '#e2e8f0' }, { t: '"/api/analyse/{doc_id}"', c: '#4ade80' }, { t: ')', c: '#e2e8f0' }] },
  { tokens: [{ t: 'def ', c: '#c084fc' }, { t: 'start_analysis', c: '#fbbf24' }, { t: '(doc_id: str):', c: '#e2e8f0' }] },
  { tokens: [{ t: '    d ', c: '#e2e8f0' }, { t: '= ', c: '#94a3b8' }, { t: '_doc_dir', c: '#38bdf8' }, { t: '(doc_id)', c: '#e2e8f0' }] },
  { tokens: [{ t: '    ', c: '' }, { t: 'threading', c: '#38bdf8' }, { t: '.Thread(target=_worker, ...).start()', c: '#e2e8f0' }] },
  { tokens: [{ t: '    ', c: '' }, { t: 'return ', c: '#c084fc' }, { t: '{', c: '#e2e8f0' }, { t: '"state"', c: '#4ade80' }, { t: ': ', c: '#e2e8f0' }, { t: '"running"', c: '#4ade80' }, { t: '}', c: '#e2e8f0' }] },
  { tokens: [] },
  { tokens: [{ t: '$ ', c: '#4ade80' }, { t: 'python ', c: '#94a3b8' }, { t: 'run.py', c: '#60a5fa' }] },
  { tokens: [{ t: '✓ ', c: '#4ade80' }, { t: 'Serving ', c: '#6b7280' }, { t: 'http://127.0.0.1:8000', c: '#fbbf24' }] },
  { tokens: [{ t: '✓ ', c: '#4ade80' }, { t: 'Upload a PDF, ', c: '#6b7280' }, { t: 'run the analysis', c: '#4ade80' }] },
]

const METRICS = [
  { label: 'Tests',     value: '329 pass', icon: '✅', color: '#4ade80', top: '-18px',  right: '-16px', bottom: 'auto', left: 'auto', delay: 0.6 },
  { label: 'Status',    value: 'Runs locally', icon: '💻', color: '#fbbf24', bottom: '55px', right: '-18px', top: 'auto',    left: 'auto', delay: 0.8 },
  { label: 'Source',    value: 'Public repo', icon: '📂', color: '#60a5fa', bottom: '-18px', left: '24px', top: 'auto',    right: 'auto', delay: 1.0 },
]

// ── Animated lines (restart every cycle) ───────────────────────────
const CodeLines = ({ cycle }: { cycle: number }) => (
  <motion.div
    key={cycle}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.25 }}
  >
    {CODE.map((line, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.16, duration: 0.18, ease: 'easeOut' }}
        style={{ minHeight: '22px', display: 'flex', alignItems: 'center' }}
      >
        {line.tokens.length === 0
          ? <span>&nbsp;</span>
          : line.tokens.map((tok, j) => (
              <span key={j} style={{ color: tok.c, fontFamily: "'Fira Code', 'Courier New', monospace", fontSize: '0.76rem', lineHeight: '22px' }}>{tok.t}</span>
            ))}
      </motion.div>
    ))}
  </motion.div>
)

// ── Terminal window ─────────────────────────────────────────────────
const CodeTerminal = () => {
  const [cycle, setCycle] = useState(0)

  useEffect(() => {
    const delay = CODE.length * 160 + 2800
    const t = setTimeout(() => setCycle(c => c + 1), delay)
    return () => clearTimeout(t)
  }, [cycle])

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '450px' }}>

      {/* Glow behind terminal */}
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{
          position: 'absolute', inset: '-20px',
          borderRadius: '20px',
          background: 'radial-gradient(ellipse, rgba(37,99,235,0.15) 0%, transparent 70%)',
          filter: 'blur(16px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Terminal box */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.93 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, type: 'spring', stiffness: 80 }}
        style={{
          position: 'relative',
          background: '#0d1117',
          borderRadius: '14px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 30px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(59,130,246,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
          zIndex: 1,
        }}
      >
        {/* Title bar */}
        <div style={{
          padding: '11px 16px',
          background: '#161b22',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['#ff5f57', '#febc2e', '#28c840'].map(c => (
              <div key={c} style={{ width: '12px', height: '12px', borderRadius: '50%', background: c }} />
            ))}
          </div>
          <span style={{ color: '#4b5563', fontSize: '0.72rem', fontFamily: 'monospace', marginLeft: '10px' }}>
            ~/manikandan/cad_agent/server.py
          </span>
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80' }} />
            <span style={{ color: '#4ade80', fontSize: '0.62rem', fontFamily: 'monospace' }}>running</span>
          </motion.div>
        </div>

        {/* Code area */}
        <div style={{ padding: '18px 20px 14px', position: 'relative', overflow: 'hidden' }}>
          {/* Scan line effect */}
          <motion.div
            animate={{ y: [-10, 380, -10] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
            style={{
              position: 'absolute', left: 0, right: 0, height: '60px',
              background: 'linear-gradient(to bottom, transparent, rgba(59,130,246,0.04), rgba(59,130,246,0.07), rgba(59,130,246,0.04), transparent)',
              pointerEvents: 'none', zIndex: 2,
            }}
          />

          {/* Line number + code */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ color: '#374151', fontFamily: 'monospace', fontSize: '0.74rem', lineHeight: '22px', userSelect: 'none', minWidth: '18px', textAlign: 'right', flexShrink: 0 }}>
              {CODE.map((_, i) => (
                <div key={i} style={{ minHeight: '22px' }}>{i + 1}</div>
              ))}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <CodeLines cycle={cycle} />
            </div>
          </div>

          {/* Blinking cursor */}
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.75, repeat: Infinity }}
            style={{ display: 'inline-block', width: '7px', height: '16px', background: '#60a5fa', borderRadius: '1px', marginTop: '6px', verticalAlign: 'middle' }}
          />
        </div>

        {/* Bottom status bar */}
        <div style={{
          padding: '6px 16px',
          background: '#1c2433',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          display: 'flex', gap: '16px', alignItems: 'center',
        }}>
          {[
            { label: 'Python 3.11', color: '#fbbf24' },
            { label: 'FastAPI', color: '#38bdf8' },
            { label: 'UTF-8', color: '#6b7280' },
            { label: 'LF', color: '#6b7280' },
          ].map(s => (
            <span key={s.label} style={{ color: s.color, fontSize: '0.62rem', fontFamily: 'monospace' }}>{s.label}</span>
          ))}
          <motion.div
            animate={{ width: ['0%', '100%', '0%'] }}
            transition={{ duration: CODE.length * 0.16 + 1, repeat: Infinity }}
            style={{ marginLeft: 'auto', height: '3px', background: 'linear-gradient(90deg, #2563eb, #60a5fa)', borderRadius: '2px', minWidth: '0', maxWidth: '80px' }}
          />
        </div>
      </motion.div>

      {/* Floating metric cards */}
      {METRICS.map((m, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.7 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: m.delay, type: 'spring', stiffness: 130 }}
          style={{
            position: 'absolute',
            top: m.top, right: m.right, bottom: m.bottom, left: m.left,
            zIndex: 10,
          }}
        >
          <motion.div
            animate={{ y: [-4, 4, -4] }}
            transition={{ duration: 2.5 + i * 0.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
            style={{
              background: 'rgba(10, 14, 26, 0.92)',
              border: `1px solid ${m.color}45`,
              borderRadius: '12px',
              padding: '10px 16px',
              display: 'flex', alignItems: 'center', gap: '10px',
              backdropFilter: 'blur(12px)',
              boxShadow: `0 8px 32px ${m.color}22, 0 0 0 1px ${m.color}18`,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>{m.icon}</span>
            <div>
              <div style={{ color: m.color, fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.2 }}>{m.value}</div>
              <div style={{ color: '#4b5563', fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</div>
            </div>
          </motion.div>
        </motion.div>
      ))}
    </div>
  )
}

// ── Section ─────────────────────────────────────────────────────────
export const WhatIDo = () => {
  const { whatIDo } = portfolioData

  return (
    <section id="skills" style={{ padding: '80px 0', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
        <div className="grid-2col">

          {/* Left: animated terminal */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <CodeTerminal />
          </div>

          {/* Right: content */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, type: 'spring', stiffness: 80 }}
          >
            <h2 className="section-heading">{whatIDo.title}</h2>
            <p className="section-subheading">{whatIDo.subtitle}</p>

            {/* Tech icon grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '2rem' }}>
              {whatIDo.techStack.map((tech, i) => (
                <motion.div
                  key={tech.name}
                  className="tech-icon-wrapper"
                  title={tech.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 150 }}
                  whileHover={{ scale: 1.15, y: -4 }}
                >
                  <i className={tech.icon} />
                  <span>{tech.name}</span>
                </motion.div>
              ))}
            </div>

            {/* Bullet points */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {whatIDo.bullets.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, type: 'spring', stiffness: 100 }}
                  style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}
                >
                  <span style={{ color: 'var(--primary)', flexShrink: 0, fontSize: '0.5rem', marginTop: '6px' }}>◆</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7 }}>{b}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
