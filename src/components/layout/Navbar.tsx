import { useState } from 'react'
import { Link } from 'react-router-dom'
import { profile } from '@/data/portfolio'

const links = [
  { label: 'Projects', to: '/#projects' },
  { label: 'Skills', to: '/#skills' },
  { label: 'Experience', to: '/#experience' },
  { label: 'Education', to: '/#education' },
  { label: 'Contact', to: '/#contact' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <header className="nav">
      <div className="wrap nav__inner">
        <Link className="nav__name" to="/" onClick={() => setOpen(false)}>{profile.name}</Link>
        <button
          className="nav__toggle"
          type="button"
          aria-expanded={open}
          aria-controls="nav-links"
          onClick={() => setOpen(o => !o)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
        <nav id="nav-links" className={`nav__links${open ? ' is-open' : ''}`} aria-label="Primary">
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)}>{l.label}</Link>
          ))}
          <a className="nav__cta" href={profile.resume} target="_blank" rel="noopener noreferrer">Resume</a>
        </nav>
      </div>
    </header>
  )
}
