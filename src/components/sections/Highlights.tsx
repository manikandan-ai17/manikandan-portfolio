import { portfolioData } from '@/data/portfolio'
import { SectionHead } from '@/components/ui/SectionHead'
import { Reveal, ImageReveal } from '@/components/ui/Reveal'

// The three engineering highlights, laid out as alternating editorial spreads.
export const Highlights = () => {
  const { achievements, sections } = portfolioData
  return (
    <section id="highlights" className="section highlights" tabIndex={-1}>
      <div className="container">
        <SectionHead index="06" eyebrow="Highlights" title={sections.highlights.title} subtitle={sections.highlights.subtitle} />
        <div className="highlights__list">
          {achievements.map((a, i) => (
            <article key={a.title} className={`highlight ${i % 2 ? 'highlight--flip' : ''}`}>
              <ImageReveal src={a.image} alt={`${a.title} diagram`} className="highlight__media" width={1200} height={675} />
              <div className="highlight__copy">
                <Reveal><span className="highlight__num display" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span></Reveal>
                <Reveal delay={0.05}><h3 className="title-lg">{a.title}</h3></Reveal>
                <Reveal delay={0.12}><p className="body">{a.desc}</p></Reveal>
                <Reveal delay={0.18}>
                  <ul className="timeline__tech">{a.tags.map((t) => <li key={t} className="chip chip--accent">{t}</li>)}</ul>
                </Reveal>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
