import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { education, experience, featuredProjects, otherProjects, profile, skillGroups } from '@/data/portfolio'
import { ProjectCard } from '@/components/ui/ProjectCard'
import { StatusPill } from '@/components/ui/StatusPill'

export function Home() {
  const { hash } = useLocation()

  useEffect(() => {
    document.title = `${profile.name} — ${profile.title}`
    if (hash) {
      requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView())
    } else {
      window.scrollTo(0, 0)
    }
  }, [hash])

  return (
    <>
      <section className="hero">
        <div className="wrap hero__grid">
          <div>
            <p className="hero__eyebrow">{profile.title}</p>
            <h1>{profile.name}</h1>
            <p className="hero__summary">{profile.summary}</p>
            <p className="hero__note">{profile.note}</p>
            <div className="hero__actions">
              <Link className="btn btn--primary" to="/#projects">See projects</Link>
              <a className="btn" href={profile.resume} target="_blank" rel="noopener noreferrer">Resume</a>
              <a className="btn" href={profile.github} target="_blank" rel="noopener noreferrer">GitHub</a>
            </div>
          </div>
          <aside className="sheet" aria-label="At a glance">
            <div className="sheet__head">
              <img className="sheet__photo" src="/manikandan.jpeg" alt={`Portrait of ${profile.name}`} width="64" height="64" />
              <div>
                <p className="sheet__name">{profile.name}</p>
                <p className="sheet__role">Junior Software Developer</p>
              </div>
            </div>
            <dl className="sheet__rows">
              <div className="kv"><dt>Employer</dt><dd>AltiusNxt Technologies</dd></div>
              <div className="kv"><dt>Location</dt><dd>{profile.location}</dd></div>
              <div className="kv"><dt>Education</dt><dd>B.Sc. Computer Technology, 2025</dd></div>
              <div className="kv"><dt>Works in</dt><dd>Python, JavaScript, TypeScript</dd></div>
              <div className="kv"><dt>Status</dt><dd>{profile.openToWork ? 'Open to new opportunities' : 'Not looking'}</dd></div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="section" id="projects">
        <div className="wrap">
          <div className="section__head">
            <p className="section__label">Projects</p>
            <h2>Featured work</h2>
            <p className="section__lede">
              Five projects I can show or explain in detail. Each page lists what is implemented,
              how it was checked, and its known limits.
            </p>
          </div>
          <div className="cards">
            {featuredProjects.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>

          <h3 className="subhead">Other projects and prototypes</h3>
          <div className="compact">
            {otherProjects.map(p => (
              <div className="compact__row" key={p.id}>
                <div className="compact__name"><Link to={`/project/${p.id}`}>{p.name}</Link></div>
                <p className="compact__tag">{p.tagline}</p>
                <StatusPill tone={p.statusTone}>{p.status}</StatusPill>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="skills">
        <div className="wrap">
          <div className="section__head">
            <p className="section__label">Skills</p>
            <h2>Tools I have used in the projects above</h2>
          </div>
          <div className="skills">
            {skillGroups.map(g => (
              <div className="skills__group" key={g.title}>
                <h3>{g.title}</h3>
                <ul>{g.items.map(i => <li key={i}>{i}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="experience">
        <div className="wrap">
          <div className="section__head">
            <p className="section__label">Experience</p>
            <h2>Work history</h2>
          </div>
          <div className="timeline">
            {experience.map(j => (
              <div className="job" key={j.role + j.period}>
                <p className="job__period">{j.period}</p>
                <div>
                  <h3>{j.role}</h3>
                  <p className="job__org">{j.company} · {j.place}</p>
                  <ul className="bullets">{j.bullets.map(b => <li key={b}>{b}</li>)}</ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="education">
        <div className="wrap">
          <div className="section__head">
            <p className="section__label">Education</p>
            <h2>Studies</h2>
          </div>
          <div className="timeline">
            {education.map(e => (
              <div className="job" key={e.school}>
                <p className="job__period">{e.period}</p>
                <div>
                  <h3>{e.degree}</h3>
                  <p className="job__org">{e.school}</p>
                  <p>{e.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="contact">
        <div className="wrap">
          <div className="section__head">
            <p className="section__label">Contact</p>
            <h2>Get in touch</h2>
            <p className="section__lede">Open to software engineering and AI/LLM application roles, including remote and international.</p>
          </div>
          <div className="contact__grid">
            <div className="contact__item"><span>Email</span><a href={`mailto:${profile.email}`}>{profile.email}</a></div>
            <div className="contact__item"><span>LinkedIn</span><a href={profile.linkedin} target="_blank" rel="noopener noreferrer">manikandan-s-032518285</a></div>
            <div className="contact__item"><span>GitHub</span><a href={profile.github} target="_blank" rel="noopener noreferrer">manikandan-ai17</a></div>
            <div className="contact__item"><span>Phone</span><p>{profile.phone}</p></div>
          </div>
        </div>
      </section>
    </>
  )
}
