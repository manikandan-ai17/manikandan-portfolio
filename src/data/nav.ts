import { portfolioData } from './portfolio'

export const NAV_LINKS = [
  { label: 'Work', href: '#work' },
  { label: 'About', href: '#about' },
  { label: 'Expertise', href: '#expertise' },
  { label: 'Experience', href: '#experience' },
  { label: 'Open Source', href: '#opensource' },
  { label: 'Contact', href: '#contact' },
]

export const MENU_LINKS: { label: string; href: string; external?: boolean }[] = [
  ...NAV_LINKS.slice(0, 4),
  { label: 'Skills', href: '#skills' },
  { label: 'GitHub', href: '#github' },
  ...NAV_LINKS.slice(4),
  { label: 'Resume', href: portfolioData.resumeLink, external: true },
]
