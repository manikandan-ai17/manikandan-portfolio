import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { showcaseProjects, type ShowcaseProject } from '@/data/projects'
import { CircleBadge } from '@/components/ui/CircleBadge'
import { RevealText, Reveal } from '@/components/ui/Reveal'
import { GithubIcon } from '@/components/ui/SocialIcons'
import { ArrowUpRight, Download } from 'lucide-react'

function ProjectCard({ p, i, total, progress }: { p: ShowcaseProject; i: number; total: number; progress: MotionValue<number> }) {
  const reduce = useReducedMotion()
  // As the following cards slide over this one, it settles back slightly
  const start = i / total
  const scale = useTransform(progress, [start, 1], [1, reduce ? 1 : 1 - (total - i) * 0.025])
  const dim = useTransform(progress, [start, Math.min(1, start + 1 / total)], [0, reduce ? 0 : 0.35])
  const n = String(i + 1).padStart(2, '0')

  return (
    <div className="project-slot" style={{ top: `calc(var(--stack-top) + ${i * 14}px)` }}>
      <motion.article className="project-card" style={{ scale }} aria-labelledby={`p-${p.id}`}>
        <div className="project-card__copy">
          <p className="eyebrow">{p.status ?? p.where} <b>· {n}</b></p>
          <h3 id={`p-${p.id}`} className="project-card__title">
            <Link to={`/project/${p.id}`} className="project-card__link">{p.name}</Link>
          </h3>
          <p className="project-card__desc">{p.desc}</p>
          {p.problem && <p className="project-card__problem"><span className="label">Problem</span> {p.problem}</p>}
          <ul className="project-card__chips" aria-label="Technologies">
            {p.tech.map((t) => <li key={t} className="chip">{t}</li>)}
          </ul>
          {p.metrics.length > 0 && (
            <ul className="project-card__metrics">
              {p.metrics.map((m) => <li key={m}>{m}</li>)}
            </ul>
          )}
          <div className="project-card__actions">
            <Link to={`/project/${p.id}`} className="btn btn--solid">Case study <ArrowUpRight size={15} /></Link>
            {p.github && <a href={p.github} target="_blank" rel="noopener noreferrer" className="btn"><GithubIcon size={15} /> Source</a>}
            {p.download && <a href={p.download} download className="btn"><Download size={15} /> Download</a>}
          </div>
        </div>
        <div className="project-card__media">
          {p.image && <img src={p.image} alt={`${p.name} overview`} loading="lazy" decoding="async" width={1200} height={675} />}
          <div className="project-card__badge">
            <CircleBadge text={`View case study • ${p.name} • `.slice(0, 60)} to={`/project/${p.id}`} label={`Open the ${p.name} case study`} size={112} />
          </div>
          <span className="project-card__meta mono">{p.where} · {p.date}</span>
        </div>
        <motion.div className="project-card__shade" style={{ opacity: dim }} aria-hidden="true" />
      </motion.article>
    </div>
  )
}

export const Work = () => {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  return (
    <section id="work" className="section work" tabIndex={-1}>
      <div className="container">
        <header className="work__head">
          <Reveal><span className="eyebrow"><b>04</b> Selected work</span></Reveal>
          <RevealText as="h2" text="Projects, with their real status" className="title-lg" highlight={['real', 'status']} />
          <Reveal delay={0.15}><p className="lede">{showcaseProjects.length} projects. Each card says where it was built and what state it is in; the case study has the details.</p></Reveal>
        </header>
        <div ref={ref} className="work__stack">
          {showcaseProjects.map((p, i) => <ProjectCard key={p.id} p={p} i={i} total={showcaseProjects.length} progress={scrollYProgress} />)}
        </div>
      </div>
    </section>
  )
}
