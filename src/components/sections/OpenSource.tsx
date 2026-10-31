import { portfolioData } from '@/data/portfolio'
import { githubActivity } from '@/data/githubActivity'
import { SectionHead } from '@/components/ui/SectionHead'
import { Reveal } from '@/components/ui/Reveal'
import { GithubIcon } from '@/components/ui/SocialIcons'
import { ArrowUpRight } from 'lucide-react'
import { motion, useInView, useReducedMotion, animate, useMotionValue, useTransform } from 'framer-motion'
import { useEffect, useRef } from 'react'

function Count({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const v = useMotionValue(reduce ? to : 0)
  const out = useTransform(v, (x) => Math.round(x))
  useEffect(() => { if (inView && !reduce) animate(v, to, { duration: 1.4, ease: 'easeOut' }) }, [inView, reduce, to, v])
  return <motion.span ref={ref}>{out}</motion.span>
}

// Contribution calendar from the dated snapshot in src/data/githubActivity.ts
function Calendar() {
  return (
    <figure className="gh-cal">
      <div className="gh-cal__grid" role="img" aria-label={`${githubActivity.total} contributions, ${githubActivity.totalLabel}`}>
        {githubActivity.levels.map((week, w) => (
          <div key={w} className="gh-cal__week">
            {week.map((lvl, d) => <i key={d} data-level={lvl} />)}
          </div>
        ))}
      </div>
      <figcaption className="gh-cal__legend mono">
        <span>Snapshot {githubActivity.asOf}</span>
        <span className="gh-cal__scale">Less {[0, 1, 2, 3, 4].map((l) => <i key={l} data-level={l} />)} More</span>
      </figcaption>
    </figure>
  )
}

export const OpenSource = () => {
  const { openSource, github, sections, githubLink, bigProjects } = portfolioData
  const stats = [
    { label: 'Total contributions', value: githubActivity.total, sub: githubActivity.totalLabel },
    { label: 'Current streak', value: githubActivity.currentStreak, sub: githubActivity.currentStreakLabel },
    { label: 'Longest streak', value: githubActivity.longestStreak, sub: githubActivity.longestStreakLabel },
    { label: 'Repositories', value: github.publicRepos, sub: 'Public on GitHub' },
    { label: 'Featured projects', value: bigProjects.length, sub: 'Labelled with real status' },
    { label: 'Tech stack items', value: github.languagesAndTools.length, sub: 'Languages & tools' },
  ]

  return (
    <section id="opensource" className="section opensource" tabIndex={-1}>
      <div className="container">
        <SectionHead index="07" eyebrow="Open source" title={sections.openSource.title} subtitle={sections.openSource.subtitle} />

        <ul className="repos">
          {openSource.map((r, i) => (
            <Reveal as="li" key={r.name} delay={i * 0.08}>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="repo">
                <span className="repo__lang mono">{r.lang}</span>
                <span className="repo__name">{r.name}</span>
                <span className="repo__desc">{r.desc}</span>
                <span className="repo__go" aria-hidden="true"><ArrowUpRight size={22} strokeWidth={1.5} /></span>
              </a>
            </Reveal>
          ))}
        </ul>

        <div id="github" className="github" tabIndex={-1}>
          <div className="github__head">
            <Reveal><span className="eyebrow"><b>07.1</b> {sections.github.title}</span></Reveal>
            <Reveal delay={0.05}><p className="label">{sections.github.subtitle}</p></Reveal>
          </div>

          <div className="github__grid">
            <Reveal className="github__panel">
              <div className="github__who">
                <GithubIcon size={20} />
                <a href={githubLink} target="_blank" rel="noopener noreferrer" className="link-underline mono">@{github.username}</a>
                <img src={`https://komarev.com/ghpvc/?username=${github.username}&color=0f766e&style=flat-square&label=Profile+Views`} alt="Profile views counter" height={20} loading="lazy" style={{ height: 20, width: 'auto' }} />
              </div>
              <ul className="github__bullets">
                {github.bullets.map(([icon, label, text]) => (
                  <li key={label}><span aria-hidden="true">{icon}</span> <b>{label}</b> {text}</li>
                ))}
              </ul>
              <p className="label" style={{ marginTop: 28 }}>Languages and tools</p>
              <ul className="timeline__tech">{github.languagesAndTools.map((t) => <li key={t} className="chip">{t}</li>)}</ul>
            </Reveal>

            <div className="github__side">
              <dl className="github__stats">
                {stats.map((s, i) => (
                  <Reveal key={s.label} delay={i * 0.05} className="github__stat">
                    <dt className="label">{s.label}</dt>
                    <dd className="display"><Count to={s.value} /></dd>
                    <dd className="github__stat-sub">{s.sub}</dd>
                  </Reveal>
                ))}
              </dl>
              <Reveal delay={0.1}><Calendar /></Reveal>
              <Reveal delay={0.15}>
                <a href={githubLink} target="_blank" rel="noopener noreferrer" className="btn">View GitHub profile <ArrowUpRight size={15} /></a>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
