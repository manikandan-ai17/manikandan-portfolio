import type { PointerEvent } from 'react'
import { portfolioData } from '@/data/portfolio'
import { SectionHead } from '@/components/ui/SectionHead'
import { Reveal } from '@/components/ui/Reveal'

// The four skill groups exactly as listed in the existing skills matrix. Each card follows the pointer with a
// soft light, and its items slide in as a list.
const spot = (e: PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

export const Skills = () => {
  const { techSkills, sections } = portfolioData
  return (
    <section id="skills" className="section skills" tabIndex={-1}>
      <div className="container">
        <SectionHead index="03" eyebrow="Skills" title={sections.skills.title} subtitle={sections.skills.subtitle} />
        <div className="skills__grid">
          {techSkills.map((g, i) => (
            <Reveal as="article" key={g.domain} delay={i * 0.08} className={`skill-card skill-card--${i}`}>
              <div className="skill-card__inner" onPointerMove={spot}>
                <div className="skill-card__head">
                  <span className="mono skill-card__idx">{String(i + 1).padStart(2, '0')} / {String(techSkills.length).padStart(2, '0')}</span>
                  <span className="skill-card__count mono">{g.items.length} items</span>
                </div>
                <h3 className="skill-card__title">{g.domain}</h3>
                <ul className="skill-card__items">
                  {g.items.map((it) => <li key={it}>{it}</li>)}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
