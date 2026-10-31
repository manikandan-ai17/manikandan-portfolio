import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import { portfolioData } from '@/data/portfolio'
import { CODE } from '@/data/codeSample'
import { SectionHead } from '@/components/ui/SectionHead'
import { Reveal } from '@/components/ui/Reveal'
import { EASE } from '@/lib/motion'
import { ArrowUpRight } from 'lucide-react'

// Syntax colours of the original sample, mapped onto this site's palette
const TONE: Record<string, string> = {
  '#c084fc': 'var(--accent-2)', '#38bdf8': 'var(--accent)', '#fbbf24': '#e9d8a6', '#4ade80': '#a7f3d0',
  '#f97316': 'var(--accent-2)', '#60a5fa': 'var(--accent-2)', '#e2e8f0': 'var(--code-text)', '#94a3b8': 'var(--code-dim)',
  '#4b5563': 'var(--code-dim)', '#6b7280': 'var(--code-dim)',
}

function CodePanel() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -15% 0px' })
  const reduce = useReducedMotion()
  return (
    <div ref={ref} className="code-panel" aria-label="Code sample from the CAD drawing analysis agent">
      <div className="code-panel__bar">
        <span className="mono">cad_agent / api.py</span>
        <span className="code-panel__dots" aria-hidden="true"><i /><i /><i /></span>
      </div>
      <pre className="code-panel__body">
        {CODE.map((line, i) => (
          <motion.span key={i} className="code-panel__line" initial={reduce ? false : { opacity: 0, x: -8 }} animate={inView ? { opacity: 1, x: 0 } : undefined} transition={{ delay: 0.2 + i * 0.07, duration: 0.4, ease: EASE }}>
            <span className="code-panel__ln" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            {line.tokens.length ? line.tokens.map((t, j) => <span key={j} style={{ color: TONE[t.c] ?? 'var(--code-text)' }}>{t.t}</span>) : ' '}
          </motion.span>
        ))}
      </pre>
      <div className="code-panel__facts">
        {portfolioData.codeSampleFacts.map((f) => (
          <div key={f.label}><span className="label">{f.label}</span><b>{f.value}</b></div>
        ))}
      </div>
    </div>
  )
}

export const Expertise = () => {
  const { whatIDo, sections } = portfolioData
  return (
    <section id="expertise" className="section section--navy expertise" tabIndex={-1}>
      <div className="container">
        <div className="expertise__grid">
          <div className="expertise__intro">
            <SectionHead index="02" eyebrow="Expertise" title={sections.expertise.title} subtitle={sections.expertise.subtitle} />
            <Reveal delay={0.15}>
              <ul className="tech-chips" aria-label="Tech stack">
                {whatIDo.techStack.map((t) => (
                  <li key={t.name} className="chip"><i className={t.icon} aria-hidden="true" /> {t.name}</li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.25}><CodePanel /></Reveal>
          </div>

          <ol className="expertise__list">
            {whatIDo.bullets.map((b, i) => (
              <Reveal as="li" key={i} delay={i * 0.06} className="expertise__row">
                <span className="expertise__num mono">{String(i + 1).padStart(2, '0')}</span>
                <p className="expertise__text">{b}</p>
                <ArrowUpRight className="expertise__arrow" size={20} strokeWidth={1.5} aria-hidden="true" />
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
