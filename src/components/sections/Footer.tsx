import { portfolioData } from '@/data/portfolio'
import { GithubIcon, LinkedinIcon } from '@/components/ui/SocialIcons'
import { Marquee } from '@/components/ui/Marquee'
import { NAV_LINKS } from '@/data/nav'
import { ArrowUp, Mail } from 'lucide-react'

export const Footer = () => {
  const { githubLink, linkedinLink, contactEmail, name, roleLabel, resumeLink } = portfolioData
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <Marquee speed={60} gap={60} className="footer__marquee">
        <span className="display footer__big">{name}</span>
        <span className="script footer__sig" aria-hidden="true">{name.split(' ')[0]}</span>
      </Marquee>
      <div className="container footer__row">
        <div>
          <span className="footer__name">{name}</span>
          <span className="label">{roleLabel}</span>
        </div>
        <nav aria-label="Footer" className="footer__nav">
          {NAV_LINKS.map((l) => <a key={l.href} href={l.href} className="link-underline">{l.label}</a>)}
          <a href={resumeLink} target="_blank" rel="noopener noreferrer" className="link-underline">Resume</a>
        </nav>
        <div className="footer__social">
          <a href={githubLink} target="_blank" rel="noopener noreferrer" aria-label="GitHub"><GithubIcon size={17} /></a>
          <a href={linkedinLink} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><LinkedinIcon size={17} /></a>
          <a href={`mailto:${contactEmail}`} aria-label="Email"><Mail size={17} /></a>
          <a href="#top" aria-label="Back to top" className="footer__top"><ArrowUp size={17} /></a>
        </div>
      </div>
      <div className="container footer__legal">
        <span>© {year} {name}</span>
        <span className="mono">Built with React, TypeScript, Vite, Tailwind CSS and Framer Motion</span>
      </div>
    </footer>
  )
}
