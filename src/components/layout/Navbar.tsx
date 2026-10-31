import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { portfolioData } from '@/data/portfolio'
import { NAV_LINKS, MENU_LINKS } from '@/data/nav'
import { useTheme } from '@/context/ThemeContext'
import { useSmoothScroll } from '@/components/ui/SmoothScroll'
import { EASE } from '@/lib/motion'
import { GithubIcon, LinkedinIcon } from '@/components/ui/SocialIcons'
import { Moon, Sun } from 'lucide-react'

export const Navbar = () => {
  const { theme, toggleTheme } = useTheme()
  const { stop, start } = useSmoothScroll()
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('')
  const menuBtn = useRef<HTMLButtonElement>(null)
  const { scrollY } = useScroll()

  // Hide while scrolling down, show again on the way up
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setHidden(y > prev && y > 400)
    setScrolled(y > 40)
  })

  // Which section is on screen, for the active link
  useEffect(() => {
    const ids = NAV_LINKS.map((l) => l.href.slice(1))
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
    }, { rootMargin: '-45% 0px -50% 0px' })
    ids.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [])

  // The open menu traps scrolling and closes on Escape
  useEffect(() => {
    if (!open) return
    stop()
    const btn = menuBtn.current
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => { start(); window.removeEventListener('keydown', onKey); btn?.focus() }
  }, [open, stop, start])

  return (
    <>
      <motion.header
        className="site-nav"
        data-scrolled={scrolled}
        animate={{ y: hidden && !open ? '-110%' : '0%' }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <a href="#top" className="site-nav__brand script" aria-label="Manikandan Santhosh, back to top">Manikandan</a>
        <nav className="site-nav__links" aria-label="Sections">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className={active === l.href.slice(1) ? 'is-active' : ''}>{l.label}</a>
          ))}
        </nav>
        <div className="site-nav__tools">
          <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button ref={menuBtn} type="button" className="menu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="site-menu">
            <span className="menu-btn__label">{open ? 'Close' : 'Menu'}</span>
            <span className={`menu-btn__icon ${open ? 'is-open' : ''}`} aria-hidden="true"><i /><i /></span>
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="site-menu"
            className="site-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ clipPath: 'inset(0% 0% 100% 0%)' }}
            animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
            exit={{ clipPath: 'inset(0% 0% 100% 0%)' }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <nav aria-label="Menu" className="site-menu__nav">
              {MENU_LINKS.map((l, i) => (
                <span key={l.label} className="line-mask">
                  <motion.a
                    href={l.href}
                    {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    onClick={() => setOpen(false)}
                    initial={{ y: '110%' }}
                    animate={{ y: '0%' }}
                    exit={{ y: '110%' }}
                    transition={{ duration: 0.75, ease: EASE, delay: 0.15 + i * 0.05 }}
                    autoFocus={i === 0}
                  >
                    <span className="site-menu__num mono">{String(i + 1).padStart(2, '0')}</span>
                    {l.label}
                  </motion.a>
                </span>
              ))}
            </nav>
            <motion.div className="site-menu__foot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.5 }}>
              <a href={`mailto:${portfolioData.contactEmail}`} className="link-underline">{portfolioData.contactEmail}</a>
              <div style={{ display: 'flex', gap: 18 }}>
                <a href={portfolioData.githubLink} target="_blank" rel="noopener noreferrer" aria-label="GitHub"><GithubIcon size={18} /></a>
                <a href={portfolioData.linkedinLink} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><LinkedinIcon size={18} /></a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
