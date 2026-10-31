import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { portfolioData } from '@/data/portfolio'
import { LiquidText } from '@/components/ui/LiquidText'
import { CircleBadge } from '@/components/ui/CircleBadge'
import { EASE } from '@/lib/motion'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

const first = portfolioData.name.split(' ')[0]
const last = portfolioData.name.split(' ').slice(1).join(' ')
// The three areas from "What I Build", shown around the name like a caption
const AREAS = portfolioData.sections.expertise.subtitle.replace(/, AND /, ', ').split(', ')
// The first sentence of the existing introduction
const INTRO = portfolioData.subTitle.split('. ')[0] + '.'

/** `ready` holds the entrance until the opening sequence has finished, so it plays once, in view. */
export const Hero = ({ ready = true }: { ready?: boolean }) => {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const nameY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '28%'])
  const nameScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 0.92])
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, reduce ? 1 : 0])

  const letter = (ch: string, i: number, base: number) => (
    <span key={i} className="word-mask">
      <motion.span style={{ display: 'inline-block' }} initial={reduce ? false : { y: '105%' }} animate={ready ? { y: '0%' } : undefined} transition={{ duration: 1.1, ease: EASE, delay: base + i * 0.045 }}>
        {ch}
      </motion.span>
    </span>
  )

  return (
    <section id="top" ref={ref} className="hero" aria-label="Introduction">
      <div className="hero__grid" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <i key={i} />)}</div>

      <motion.div className="hero__top container" initial={{ opacity: 0 }} animate={ready ? { opacity: 1 } : undefined} transition={{ delay: 0.9, duration: 0.8 }}>
        <span className="eyebrow"><b>●</b> {portfolioData.roleLabel}</span>
        <span className="hero__status mono">
          <span className="pulse" aria-hidden="true" />
          {portfolioData.openToOpportunities ? 'Open to opportunities' : 'Not available'}
        </span>
      </motion.div>

      <motion.div className="hero__name" style={{ y: nameY, scale: nameScale }}>
        <LiquidText>
          <h1 className="display hero__first" aria-label={portfolioData.name}>
            <span aria-hidden="true">{[...first.toUpperCase()].map((c, i) => letter(c, i, 0.15))}</span>
          </h1>
        </LiquidText>
        <div className="hero__second" aria-hidden="true">
          <motion.span className="hero__area mono" initial={{ opacity: 0, x: -20 }} animate={ready ? { opacity: 1, x: 0 } : undefined} transition={{ delay: 1.1, duration: 0.8, ease: EASE }}>{AREAS[0]}</motion.span>
          <span className="display hero__last">{[...last.toUpperCase()].map((c, i) => letter(c, i, 0.55))}</span>
          <motion.span className="hero__area mono" initial={{ opacity: 0, x: 20 }} animate={ready ? { opacity: 1, x: 0 } : undefined} transition={{ delay: 1.1, duration: 0.8, ease: EASE }}>{AREAS[1]}</motion.span>
        </div>
        <motion.p className="hero__area hero__area--center mono" aria-hidden="true" initial={{ opacity: 0, y: 10 }} animate={ready ? { opacity: 1, y: 0 } : undefined} transition={{ delay: 1.25, duration: 0.8, ease: EASE }}>
          <span className="dot" /> {AREAS[2]} <span className="dot" />
        </motion.p>
      </motion.div>

      <motion.div className="hero__bottom container" style={{ opacity: fade }}>
        <motion.div className="hero__intro" initial={{ opacity: 0, y: 24 }} animate={ready ? { opacity: 1, y: 0 } : undefined} transition={{ delay: 1.2, duration: 0.9, ease: EASE }}>
          <p>{INTRO}</p>
          <div className="hero__ctas">
            <a href="#work" className="btn btn--solid">View work <ArrowDownRight size={15} /></a>
            <a href="#contact" className="btn">Get in touch</a>
            <a href={portfolioData.resumeLink} target="_blank" rel="noopener noreferrer" className="btn">Resume <ArrowUpRight size={15} /></a>
          </div>
        </motion.div>

        <motion.a href="#about" className="hero__scroll mono" initial={{ opacity: 0 }} animate={ready ? { opacity: 1 } : undefined} transition={{ delay: 1.6 }}>
          Scroll to explore
          <span className="hero__scroll-line" aria-hidden="true"><i /></span>
        </motion.a>

        <motion.div className="hero__badge" initial={{ opacity: 0, scale: 0.8, rotate: -40 }} animate={ready ? { opacity: 1, scale: 1, rotate: 0 } : undefined} transition={{ delay: 1.4, duration: 1, ease: EASE }}>
          <CircleBadge text="Let's work together • Let's work together • " href="#contact" label="Let's work together: go to contact" size={124} />
          <span className="label">Based in {portfolioData.location}</span>
        </motion.div>
      </motion.div>
    </section>
  )
}
