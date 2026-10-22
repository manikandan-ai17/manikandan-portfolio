import { portfolioData } from '@/data/portfolio'
import { motion } from 'framer-motion'
import { GithubIcon } from '@/components/ui/SocialIcons'

const Star = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#fbbf24' }}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

const Fork = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text-secondary)' }}>
    <path d="M5 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM3 5a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm14-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-2 2a2 2 0 1 1 4 0 2 2 0 0 1-4 0zM12 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-2 2a2 2 0 1 1 4 0 2 2 0 0 1-4 0zM5 7a1 1 0 0 1 1 1v3a1 1 0 0 0 1 1h4v1a1 1 0 0 1-1 1H7a3 3 0 0 1-3-3V8a1 1 0 0 1 1-1zm14 0a1 1 0 0 1 1 1v3a3 3 0 0 1-3 3h-4v-1a1 1 0 0 1 1-1h4a1 1 0 0 0 1-1V8a1 1 0 0 1 1-1z" />
  </svg>
)

export const OpenSource = () => {
  const { openSource, githubLink } = portfolioData

  return (
    <section id="opensource" style={{ padding: '80px 0', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="section-heading">Open Source</h2>
          <p className="section-subheading">PUBLIC REPOSITORIES ON GITHUB</p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '2.5rem' }} className="max-md:grid-cols-1">
          {openSource.map((repo, i) => (
            <motion.div
              key={i}
              className="os-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>📁</span>
                <a
                  href={(repo as any).url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1rem', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {repo.name}
                </a>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, flex: 1 }}>
                {repo.desc}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3572A5', display: 'inline-block' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{repo.lang}</span>
                </div>
                <div style={{ display: 'flex', gap: '14px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    <Fork /> {repo.forks}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    <Star /> {repo.stars}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <a href={githubLink} target="_blank" rel="noopener noreferrer" className="btn-primary">
            <GithubIcon size={18} />
            MORE PROJECTS
          </a>
        </div>
      </div>
    </section>
  )
}
