import { portfolioData } from '@/data/portfolio'
import { GithubIcon, LinkedinIcon } from '@/components/ui/SocialIcons'
import { Mail } from 'lucide-react'

export const Footer = () => {
  const { githubLink, linkedinLink, contactEmail } = portfolioData
  const year = new Date().getFullYear()

  return (
    <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)', padding: '2.5rem 2rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>

        {/* Left: name + role */}
        <div>
          <span style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Manikandan Santhosh
          </span>
          <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.5px' }}>
            AI Systems Engineer
          </span>
        </div>

        {/* Center: social icons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href={githubLink} target="_blank" rel="noopener noreferrer" className="social-btn" style={{ background: '#181717', width: '36px', height: '36px' }} aria-label="GitHub">
            <GithubIcon size={16} />
          </a>
          <a href={linkedinLink} target="_blank" rel="noopener noreferrer" className="social-btn" style={{ background: '#0077B5', width: '36px', height: '36px' }} aria-label="LinkedIn">
            <LinkedinIcon size={16} />
          </a>
          <a href={`mailto:${contactEmail}`} className="social-btn" style={{ background: '#D44638', width: '36px', height: '36px' }} aria-label="Email">
            <Mail size={16} />
          </a>
        </div>

        {/* Right: copyright */}
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          © {year} Manikandan Santhosh
        </span>
      </div>
    </footer>
  )
}
