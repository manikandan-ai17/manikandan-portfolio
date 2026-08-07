import { useState, useEffect } from 'react'
import { useTheme } from '@/context/ThemeContext'

const navLinks = [
  { label: 'Skills', href: '#skills' },
  { label: 'Experience', href: '#experience' },
  { label: 'Projects', href: '#projects' },
  { label: 'Open Source', href: '#opensource' },
  { label: 'GitHub', href: '#github' },
  { label: 'Education', href: '#education' },
  { label: 'Writing', href: '#blogs' },
  { label: 'Resume', href: '/resume.html' },
  { label: 'Contact', href: '#contact' },
]

export const Navbar = () => {
  const { toggleTheme } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: scrolled ? 'var(--nav-bg)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : 'none',
        transition: 'all 0.3s ease',
        padding: '0 1.5rem',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo — Inter instead of Dancing Script */}
        <a
          href="#greeting"
          style={{
            fontFamily: '"Inter", -apple-system, sans-serif',
            fontSize: 'clamp(1rem, 3vw, 1.1rem)',
            fontWeight: 700,
            color: 'var(--primary)',
            textDecoration: 'none',
            letterSpacing: '-0.01em',
          }}
        >
          Manikandan Santhosh
        </a>

        {/* Desktop nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }} className="hidden md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target={link.href.startsWith('/') ? '_blank' : undefined}
              rel={link.href.startsWith('/') ? 'noopener noreferrer' : undefined}
              style={{
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: '0.82rem',
                fontWeight: 500,
                padding: '6px 11px',
                borderRadius: '6px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text)'
                e.currentTarget.style.background = 'var(--bg-secondary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {link.label}
            </a>
          ))}
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            title="Toggle theme"
            aria-label="Toggle dark/light mode"
            style={{ marginLeft: '10px' }}
          />
        </div>

        {/* Mobile hamburger */}
        <div className="flex md:hidden items-center gap-3">
          <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme" />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1.4rem', cursor: 'pointer', padding: '4px' }}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--border)',
          padding: '0.75rem 1.5rem 1.25rem',
        }}>
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                padding: '10px 0',
                fontSize: '0.9rem',
                fontWeight: 500,
                borderBottom: '1px solid var(--border)',
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  )
}
