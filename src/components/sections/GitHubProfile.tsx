import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { portfolioData } from '@/data/portfolio'
import { ScrollReveal } from '@/components/ui/ScrollReveal'

// ── Deterministic contribution graph ────────────────────────────────────────
function pr(seed: number) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}
const WEEKS = 52
const DAYS = 7
function buildGraph() {
  const grid: number[][] = []
  for (let w = 0; w < WEEKS; w++) {
    const col: number[] = []
    for (let d = 0; d < DAYS; d++) {
      const recency = w / WEEKS
      const r = pr(w * 7 + d)
      let level = 0
      if (r < recency * 0.18) level = 1
      else if (r < recency * 0.3) level = 2
      else if (r < recency * 0.42) level = 3
      else if (r < recency * 0.5) level = 4
      col.push(level)
    }
    grid.push(col)
  }
  return grid
}
const GRAPH = buildGraph()
const CELL_COLOR: Record<number, string> = {
  0: 'rgba(255,255,255,0.05)',
  1: '#0e4429',
  2: '#006d32',
  3: '#26a641',
  4: '#39d353',
}

// ── Badge data ───────────────────────────────────────────────────────────────
const BADGES = [
  { label: 'Python',       bg: '#3776AB', color: '#fff' },
  { label: 'FastAPI',      bg: '#009688', color: '#fff' },
  { label: 'React',        bg: '#20232A', color: '#61DAFB', border: '#444' },
  { label: 'TypeScript',   bg: '#007ACC', color: '#fff' },
  { label: 'JavaScript',   bg: '#F7DF1E', color: '#111' },
  { label: 'Docker',       bg: '#2496ED', color: '#fff' },
  { label: 'GCP',          bg: '#4285F4', color: '#fff' },
  { label: 'PostgreSQL',   bg: '#316192', color: '#fff' },
  { label: 'Flask',        bg: '#1c1c1c', color: '#fff', border: '#444' },
  { label: 'Node.js',      bg: '#339933', color: '#fff' },
  { label: 'LLMs',         bg: '#7c3aed', color: '#fff' },
  { label: 'LoRA / PEFT',  bg: '#db2777', color: '#fff' },
  { label: 'OCR',          bg: '#d97706', color: '#fff' },
  { label: 'YOLO',         bg: '#27338e', color: '#fff' },
  { label: 'Git',          bg: '#F05032', color: '#fff' },
  { label: 'Linux',        bg: '#4B4B4B', color: '#FCC624' },
]

const BULLETS: [string, string, string][] = [
  ['🔭', 'Currently building:', 'Enterprise AI systems — LLM extraction pipelines, OCR document AI, Chrome extensions'],
  ['🌱', 'Currently learning:', 'Advanced RAG systems, LangChain, and cloud-native AI deployment'],
  ['💬', 'Ask me about:', 'Python, FastAPI, LLM integration, LoRA fine-tuning, Chrome Extensions (MV3)'],
  ['🚀', 'Shipped:', '6 production AI systems for enterprise clients'],
  ['⚡', 'Fun fact:', 'I built a dual-LLM pipeline where two models independently agree before any data is trusted!'],
]

// ── Animated counter ─────────────────────────────────────────────────────────
function AnimatedCount({ to, duration = 1.4 }: { to: number; duration?: number }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, v => Math.round(v))
  const ref = useRef<HTMLSpanElement>(null)
  const triggered = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true
          animate(count, to, { duration, ease: 'easeOut' })
        }
      },
      { threshold: 0.5 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [count, to, duration])

  return (
    <motion.span ref={ref} style={{ display: 'inline-block' }}>
      {rounded}
    </motion.span>
  )
}

// ── Animated language bar ────────────────────────────────────────────────────
function LangBar({ lang, pct, color, delay }: { lang: string; pct: number; color: string; delay: number }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', color: '#c9d1d9', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{lang}</span>
        <span style={{ fontSize: '12px', color: '#8b949e', fontFamily: "'JetBrains Mono', monospace" }}>{pct}%</span>
      </div>
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '100px', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay, ease: 'easeOut' }}
          style={{ height: '100%', background: color, borderRadius: '100px' }}
        />
      </div>
    </div>
  )
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, color, delay,
}: { icon: string; label: string; value: number; sub?: string; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -4, boxShadow: `0 12px 30px ${color}22` }}
      style={{
        background: '#0d1117',
        border: `1px solid ${color}33`,
        borderRadius: '12px',
        padding: '18px 16px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
      }}
    >
      {/* Glow top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: color,
      }} />
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)',
        width: '80px', height: '80px', borderRadius: '50%',
        background: color, opacity: 0.06, filter: 'blur(20px)',
      }} />
      <div style={{ fontSize: '20px', marginBottom: '6px' }}>{icon}</div>
      <div style={{ fontSize: '28px', fontWeight: 900, color, lineHeight: 1, marginBottom: '6px', fontFamily: "'JetBrains Mono', monospace" }}>
        <AnimatedCount to={value} />
        {value >= 10 ? '+' : ''}
      </div>
      <div style={{ fontSize: '11px', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: '10px', color: '#484f58', marginTop: '4px' }}>{sub}</div>}
    </motion.div>
  )
}

// ── Streak card (custom, no external image) ───────────────────────────────────
function StreakCard() {
  const stats = [
    { label: 'Total Contributions', value: 44, sub: 'Jun 2024 – Present', color: '#0891b2' },
    { label: 'Current Streak', value: 1, sub: 'Jul 21', color: '#a78bfa', highlight: true },
    { label: 'Longest Streak', value: 2, sub: 'Jul 7 – Jul 8', color: '#34d399' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      style={{
        background: '#0d1117',
        border: '1px solid #30363d',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '12px',
      }}
    >
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)',
        borderBottom: '1px solid #30363d',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ fontSize: '14px' }}>🔥</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#e6edf3', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px' }}>
          GITHUB STATS
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', alignItems: 'center', padding: '24px 20px' }}>
        {stats.map((s, i) => (
          <>
            <div key={s.label} style={{ textAlign: 'center' }}>
              {s.highlight ? (
                /* Flame ring for current streak */
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                    style={{
                      position: 'absolute',
                      width: '72px', height: '72px',
                      borderRadius: '50%',
                      background: 'conic-gradient(from 0deg, #a78bfa, #60a5fa, #a78bfa)',
                      opacity: 0.3,
                    }}
                  />
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    border: `3px solid ${s.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column',
                    background: '#0d1117',
                  }}>
                    <span style={{ fontSize: '10px' }}>🔥</span>
                    <span style={{ fontSize: '20px', fontWeight: 900, color: s.color, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>
                      <AnimatedCount to={s.value} duration={0.8} />
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '32px', fontWeight: 900, color: s.color, fontFamily: "'JetBrains Mono', monospace", marginBottom: '8px', lineHeight: 1 }}>
                  <AnimatedCount to={s.value} duration={1.2} />
                </div>
              )}
              <div style={{ fontSize: '11px', fontWeight: 700, color: s.color }}>{s.label}</div>
              <div style={{ fontSize: '10px', color: '#8b949e', marginTop: '3px' }}>{s.sub}</div>
            </div>
            {i < 2 && (
              <div key={`sep-${i}`} style={{ width: '1px', height: '70px', background: '#30363d', margin: '0 8px' }} />
            )}
          </>
        ))}
      </div>
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export const GitHubProfile = () => {
  const { githubLink, linkedinLink, contactEmail } = portfolioData

  return (
    <section id="github" style={{ padding: '80px 0', background: 'var(--bg-secondary)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem' }}>

        <ScrollReveal direction="up">
          <h2 className="section-heading">GitHub Profile</h2>
          <p className="section-subheading">OPEN SOURCE ACTIVITY &amp; DEVELOPER OVERVIEW</p>
        </ScrollReveal>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{
            background: '#0d1117',
            border: '1px solid #30363d',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}
        >
          {/* Window chrome */}
          <div style={{
            background: '#161b22', borderBottom: '1px solid #30363d',
            padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '7px',
          }}>
            {['#EF4444', '#F59E0B', '#10B981'].map(c => (
              <div key={c} style={{ width: '11px', height: '11px', borderRadius: '50%', background: c, opacity: 0.85 }} />
            ))}
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#8b949e', marginLeft: '10px' }}>
              manikandan-santhosh / README.md
            </span>
          </div>

          <div style={{ padding: '32px 36px' }}>

            {/* ── Greeting ── */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <motion.h3
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                style={{ fontSize: '1.6rem', fontWeight: 900, color: '#e6edf3', marginBottom: '6px', letterSpacing: '-0.3px' }}
              >
                Hi 👋, I'm Manikandan Santhosh!
              </motion.h3>
              <p style={{ fontSize: '0.9rem', color: '#8b949e', marginBottom: '14px' }}>
                AI Developer · Python Developer · Full-Stack Developer from India 🇮🇳
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <img src="https://komarev.com/ghpvc/?username=manikandan-santhosh&color=0891b2&style=flat-square&label=Profile+Views" alt="views" style={{ height: '20px' }} />
                <a href={linkedinLink} target="_blank" rel="noopener noreferrer">
                  <img src="https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=flat-square&logo=linkedin" alt="LinkedIn" style={{ height: '20px' }} />
                </a>
                <a href={`mailto:${contactEmail}`}>
                  <img src="https://img.shields.io/badge/Gmail-Contact-D44638?style=flat-square&logo=gmail&logoColor=white" alt="Gmail" style={{ height: '20px' }} />
                </a>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #21262d', margin: '0 0 24px' }} />

            {/* ── About bullets ── */}
            <ul style={{ listStyle: 'none', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {BULLETS.map(([icon, label, text], i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  style={{ fontSize: '0.9rem', color: '#c9d1d9', lineHeight: 1.65 }}
                >
                  {icon}&nbsp;&nbsp;<strong style={{ color: '#e6edf3' }}>{label}</strong> {text}
                </motion.li>
              ))}
            </ul>

            <hr style={{ border: 'none', borderTop: '1px solid #21262d', margin: '0 0 24px' }} />

            {/* ── Tech badges ── */}
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e6edf3', marginBottom: '12px' }}>🛠️ Languages and Tools</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '28px' }}>
              {BADGES.map((b, i) => (
                <motion.span
                  key={b.label}
                  initial={{ opacity: 0, scale: 0.7 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.025 }}
                  whileHover={{ scale: 1.1, y: -2 }}
                  style={{
                    background: b.bg, color: b.color,
                    border: b.border ? `1px solid ${b.border}` : undefined,
                    padding: '4px 11px', borderRadius: '5px',
                    fontSize: '12px', fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    cursor: 'default', display: 'inline-block',
                  }}
                >
                  {b.label}
                </motion.span>
              ))}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #21262d', margin: '0 0 24px' }} />

            {/* ── GitHub Stats ── */}
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e6edf3', marginBottom: '16px' }}>📊 GitHub Stats</h4>

            {/* Streak card */}
            <StreakCard />

            {/* Stat cards row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }} className="max-md:grid-cols-1">
              <StatCard icon="📦" label="Repositories" value={10} sub="Public projects" color="#0891b2" delay={0} />
              <StatCard icon="⚡" label="AI Systems Shipped" value={6} sub="Enterprise clients" color="#a78bfa" delay={0.1} />
              <StatCard icon="🛠️" label="Tech Stack Items" value={16} sub="Languages & tools" color="#34d399" delay={0.2} />
            </div>

            {/* Language breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              style={{
                background: '#0d1117', border: '1px solid #30363d',
                borderRadius: '12px', padding: '18px 20px', marginBottom: '12px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#e6edf3', marginBottom: '14px', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px' }}>
                TOP LANGUAGES
              </div>
              <LangBar lang="Python"      pct={62} color="#3776AB" delay={0.1} />
              <LangBar lang="TypeScript"  pct={20} color="#007ACC" delay={0.2} />
              <LangBar lang="JavaScript"  pct={12} color="#F7DF1E" delay={0.3} />
              <LangBar lang="HTML / CSS"  pct={6}  color="#E34F26" delay={0.4} />
            </motion.div>

            <hr style={{ border: 'none', borderTop: '1px solid #21262d', margin: '0 0 24px' }} />

            {/* ── Contribution graph ── */}
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e6edf3', marginBottom: '14px' }}>📅 Contribution Activity</h4>
            <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
              <div style={{ display: 'flex', gap: '3px', minWidth: 'max-content' }}>
                {GRAPH.map((col, wi) => (
                  <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {col.map((level, di) => (
                      <motion.div
                        key={di}
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: wi * 0.008 + di * 0.004, duration: 0.15 }}
                        style={{
                          width: '11px', height: '11px', borderRadius: '2px',
                          background: CELL_COLOR[level],
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '8px', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '10px', color: '#8b949e' }}>Less</span>
                {[0, 1, 2, 3, 4].map(l => (
                  <div key={l} style={{ width: '11px', height: '11px', borderRadius: '2px', background: CELL_COLOR[l] }} />
                ))}
                <span style={{ fontSize: '10px', color: '#8b949e' }}>More</span>
              </div>
            </div>

            {/* ── Footer ── */}
            <div style={{ textAlign: 'center', marginTop: '28px' }}>
              <p style={{ fontSize: '0.82rem', color: '#8b949e', fontStyle: 'italic', marginBottom: '16px' }}>
                Open to roles as an AI Developer, Python Developer, or Full-Stack Developer
              </p>
              <div style={{
                height: '48px',
                background: 'linear-gradient(90deg, #0891b2, #2563eb, #7c3aed)',
                borderRadius: '8px', marginBottom: '18px', opacity: 0.35,
                clipPath: 'ellipse(52% 100% at 50% 100%)',
              }} />
              <motion.a
                href={githubLink} target="_blank" rel="noopener noreferrer"
                className="btn-primary"
                style={{ textDecoration: 'none', display: 'inline-flex' }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                View GitHub Profile →
              </motion.a>
            </div>

          </div>
        </motion.div>
      </div>
    </section>
  )
}
