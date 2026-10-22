import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { allProjects, profile } from '@/data/portfolio'
import { StatusPill } from '@/components/ui/StatusPill'

export function ProjectDetail() {
  const { id } = useParams()
  const project = allProjects.find(p => p.id === id)

  useEffect(() => {
    document.title = project ? `${project.name} — ${profile.name}` : `Not found — ${profile.name}`
    window.scrollTo(0, 0)
  }, [project])

  if (!project) {
    return (
      <div className="wrap notfound">
        <h1>Page not found</h1>
        <p><Link to="/#projects">Back to projects</Link></p>
      </div>
    )
  }

  return (
    <div className="wrap detail">
      <Link className="back" to="/#projects">← All projects</Link>
      <div><StatusPill tone={project.statusTone}>{project.status}</StatusPill></div>
      <h1>{project.name}</h1>
      <p className="detail__tagline">{project.tagline}</p>
      <p className="detail__note">{project.statusNote}</p>

      {project.links.length > 0 && (
        <div className="detail__links">
          {project.links.map(l => (
            <a key={l.href} className="btn btn--primary" href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
          ))}
        </div>
      )}

      <div className="detail__grid">
        <div>
          <section className="detail__block">
            <h2>Overview</h2>
            <p>{project.summary}</p>
          </section>

          {project.features.length > 0 && (
            <section className="detail__block">
              <h2>Implemented</h2>
              <ul className="bullets">{project.features.map(f => <li key={f}>{f}</li>)}</ul>
            </section>
          )}

          {project.evidence.length > 0 && (
            <section className="detail__block">
              <h2>How this was checked</h2>
              <ul className="bullets">{project.evidence.map(f => <li key={f}>{f}</li>)}</ul>
            </section>
          )}

          {project.limitations.length > 0 && (
            <section className="detail__block">
              <h2>Limitations</h2>
              <ul className="bullets limits">{project.limitations.map(f => <li key={f}>{f}</li>)}</ul>
            </section>
          )}
        </div>

        <aside className="sheet detail__aside" aria-label="Project facts">
          <dl className="sheet__rows">
            <div className="kv"><dt>My role</dt><dd>{project.role}</dd></div>
            <div className="kv">
              <dt>Stack</dt>
              <dd><ul className="chips">{project.stack.map(s => <li key={s} className="chip">{s}</li>)}</ul></dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  )
}
