import { useId, type ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

/** A slowly rotating ring of text around an arrow, used as a call to action. */
export function CircleBadge({ text, href, to, size = 132, label, icon, external }: {
  text: string; href?: string; to?: string; size?: number; label: string; icon?: ReactNode; external?: boolean
}) {
  const id = useId().replace(/:/g, '')
  const ring = (
    <svg className="badge-ring" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <path id={`c${id}`} d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
      </defs>
      <text fill="currentColor" style={{ fontFamily: 'var(--font-mono)', fontSize: '8.4px', letterSpacing: '2.6px', textTransform: 'uppercase' }}>
        <textPath href={`#c${id}`}>{text}</textPath>
      </text>
    </svg>
  )
  const body = (
    <>
      {ring}
      <span className="circle-badge__core">{icon ?? <ArrowUpRight size={size * 0.16} strokeWidth={1.6} />}</span>
    </>
  )
  const style = { width: size, height: size }
  if (to) return <Link to={to} className="circle-badge" style={style} aria-label={label}>{body}</Link>
  return (
    <a href={href} className="circle-badge" style={style} aria-label={label} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {body}
    </a>
  )
}
