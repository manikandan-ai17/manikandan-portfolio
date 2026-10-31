import { RevealText, Reveal } from './Reveal'

/** Section opener: index + eyebrow, a large title that rises in, and the original subheading as a mono caption. */
export function SectionHead({ index, eyebrow, title, subtitle, align = 'left' }: {
  index: string; eyebrow: string; title: string; subtitle?: string; align?: 'left' | 'center'
}) {
  return (
    <header className={`section-head section-head--${align}`}>
      <Reveal><span className="eyebrow"><b>{index}</b> {eyebrow}</span></Reveal>
      <RevealText as="h2" text={title} className="title-xl section-head__title" stagger={0.06} />
      {subtitle && <Reveal delay={0.2}><p className="label section-head__sub">{subtitle}</p></Reveal>}
    </header>
  )
}
