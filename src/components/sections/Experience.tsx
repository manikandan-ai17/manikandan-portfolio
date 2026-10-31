import { portfolioData } from '@/data/portfolio'
import { SectionHead } from '@/components/ui/SectionHead'
import { Reveal } from '@/components/ui/Reveal'

// Employment history (the experience entries without their own project page) and education.
const jobs = portfolioData.experiences.filter((e) => !('id' in e))

export const Experience = () => {
  const { sections, education } = portfolioData
  return (
    <section id="experience" className="section section--navy experience" tabIndex={-1}>
      <div className="container">
        <SectionHead index="05" eyebrow="Experience" title={sections.experience.title} subtitle={sections.experience.subtitle} />

        <ol className="timeline">
          {jobs.map((j, i) => (
            <Reveal as="li" key={j.role + j.date} delay={i * 0.06} className="timeline__row">
              <div className="timeline__when mono">
                <span>{j.date}</span>
                {i === 0 && <span className="chip chip--accent">Current</span>}
              </div>
              <div className="timeline__who">
                <h3 className="title-md">{j.role}</h3>
                <p className="timeline__company">{j.company}</p>
              </div>
              <div className="timeline__what">
                <p className="body">{j.desc}</p>
                <ul className="timeline__bullets">
                  {j.descBullets.map((b) => <li key={b}>{b}</li>)}
                </ul>
                <ul className="timeline__tech" aria-label="Technologies">
                  {j.tech.map((t) => <li key={t} className="chip">{t}</li>)}
                </ul>
              </div>
            </Reveal>
          ))}
        </ol>

        <div id="education" className="education" tabIndex={-1}>
          <Reveal><span className="eyebrow"><b>05.1</b> {sections.education.title} · {sections.education.subtitle.toLowerCase()}</span></Reveal>
          {education.map((e) => (
            <Reveal key={e.school} delay={0.1} className="education__card">
              <img src={e.logoImg} alt={`${e.school} logo`} width={72} height={72} loading="lazy" className="education__logo" />
              <div>
                <h3 className="title-md">{e.degree}</h3>
                <p className="timeline__company">{e.school}</p>
              </div>
              <span className="mono education__when">{e.duration}</span>
              <div className="education__detail">
                <p className="body">{e.desc}</p>
                <ul className="timeline__bullets">{e.descBullets.map((b) => <li key={b}>{b}</li>)}</ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
