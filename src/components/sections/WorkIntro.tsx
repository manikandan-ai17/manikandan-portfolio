import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { portfolioData } from '@/data/portfolio'
import { Marquee } from '@/components/ui/Marquee'

// Transition into the projects: the tech stack ticks past, then "WORK" grows to fill the screen as you scroll.
export const WorkIntro = () => {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const scale = useTransform(scrollYProgress, [0.1, 0.55], reduce ? [1, 1] : [0.72, 1])
  const spacing = useTransform(scrollYProgress, [0.1, 0.55], reduce ? ['-0.01em', '-0.01em'] : ['0.12em', '-0.01em'])
  const lineH = useTransform(scrollYProgress, [0.05, 0.4], ['0%', '100%'])
  const areas = portfolioData.sections.expertise.subtitle.replace(/, AND /, ', ').split(', ')
  const disciplines = [...areas, ...portfolioData.techSkills.map((g) => g.domain.toUpperCase())]

  return (
    <section ref={ref} className="work-intro" aria-label="Selected work">
      <Marquee speed={36} gap={56} className="work-intro__tech" label="Tech stack">
        {portfolioData.whatIDo.techStack.map((t) => (
          <span key={t.name} className="work-intro__tech-item"><i className={t.icon} aria-hidden="true" />{t.name}</span>
        ))}
      </Marquee>

      <div className="work-intro__center">
        <p className="mono work-intro__kicker">Scroll to explore my</p>
        <span className="work-intro__line" aria-hidden="true"><motion.i style={{ height: lineH }} /></span>
        <motion.h2 className="display work-intro__word" style={{ scale, letterSpacing: spacing }}>Work</motion.h2>
      </div>

      <Marquee speed={48} gap={40} reverse className="work-intro__disciplines">
        {disciplines.map((d) => (
          <span key={d} className="work-intro__disc mono">{d}<span className="accent" aria-hidden="true">✦</span></span>
        ))}
      </Marquee>
    </section>
  )
}
