import { Link } from 'react-router-dom'
import type { Project } from '@/data/portfolio'
import { StatusPill } from '@/components/ui/StatusPill'

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="card">
      <div className="card__top">
        <h3>{project.name}</h3>
        <StatusPill tone={project.statusTone}>{project.status}</StatusPill>
      </div>
      <p className="card__tagline">{project.tagline}</p>
      <dl className="card__meta">
        <div className="kv">
          <dt>Stack</dt>
          <dd>
            <ul className="chips">
              {project.stack.slice(0, 8).map(s => <li key={s} className="chip">{s}</li>)}
            </ul>
          </dd>
        </div>
        <div className="kv">
          <dt>Access</dt>
          <dd>{project.statusNote}</dd>
        </div>
      </dl>
      <Link className="card__link" to={`/project/${project.id}`}>Evidence and limitations →</Link>
    </article>
  )
}
