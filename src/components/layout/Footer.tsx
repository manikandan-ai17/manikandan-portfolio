import { profile } from '@/data/portfolio'

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer__inner">
        <span>© {new Date().getFullYear()} {profile.name}</span>
        <span>Project status and figures were checked against source code on 22 Oct 2026.</span>
      </div>
    </footer>
  )
}
