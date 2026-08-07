import { portfolioData } from '@/data/portfolio'
import { motion } from 'framer-motion'
import { GithubIcon, LinkedinIcon } from '@/components/ui/SocialIcons'
import { Mail, MapPin } from 'lucide-react'

export const Contact = () => {
  const { socialLinks, location, openToOpportunities, contactEmail } = portfolioData

  return (
    <section id="contact" style={{ padding: '80px 0', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginBottom: '3rem' }}
        >
          <h2 className="section-heading">Let's Connect</h2>
          <p className="section-subheading">AI DEVELOPER · PYTHON DEVELOPER · FULL-STACK DEVELOPER</p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'start' }} className="max-md:grid-cols-1">

          {/* Left: info */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.75, marginBottom: '2rem' }}>
              I'm open to roles as an AI Developer, Python Developer, or Full-Stack Developer. If you're building LLM-powered tools, document AI systems, Python backends, or AI-integrated web apps — I'd like to talk.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MapPin size={15} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{location}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={15} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                <a
                  href={`mailto:${contactEmail}`}
                  style={{ color: 'var(--primary)', fontSize: '0.9rem', textDecoration: 'none', fontWeight: 500 }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {contactEmail}
                </a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '15px', height: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: openToOpportunities ? '#22c55e' : '#ef4444', display: 'block' }} />
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {openToOpportunities ? 'Open to opportunities' : 'Currently unavailable'}
                </span>
              </div>
            </div>

            {/* Social links */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-btn"
                  style={{ background: s.bg }}
                  title={s.label}
                  aria-label={s.label}
                >
                  {s.icon === 'github' && <GithubIcon size={18} />}
                  {s.icon === 'linkedin' && <LinkedinIcon size={18} />}
                  {s.icon === 'mail' && <Mail size={18} />}
                </a>
              ))}
            </div>
          </motion.div>

          {/* Right: profile photo */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            style={{ display: 'flex', justifyContent: 'center' }}
            className="max-md:hidden"
          >
            <div style={{ position: 'relative' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                style={{ position: 'absolute', inset: '-5px', borderRadius: '50%', background: 'conic-gradient(from 0deg, var(--primary), #60a5fa, #818cf8, #38bdf8, var(--primary))' }}
              />
              <div style={{ position: 'absolute', inset: '-2px', borderRadius: '50%', background: 'var(--bg)' }} />
              <div style={{ position: 'relative', zIndex: 2, width: '180px', height: '180px', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 12px 40px rgba(37,99,235,0.2)' }}>
                <img
                  src="/manikandan.jpeg"
                  alt="Manikandan Santhosh"
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
