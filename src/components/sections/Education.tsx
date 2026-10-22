import { portfolioData } from '@/data/portfolio'
import { motion } from 'framer-motion'

export const Education = () => {
  const { education } = portfolioData

  return (
    <section id="education" style={{ padding: '80px 0', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 2rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="section-heading">Education</h2>
          <p className="section-subheading">ACADEMIC BACKGROUND</p>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {education.map((edu, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              style={{ display: 'flex', gap: '24px', paddingBottom: '28px', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}
            >
              {/* Logo */}
              <div style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
                border: '3px solid var(--primary)',
                boxShadow: '0 4px 20px rgba(37,99,235,0.25)',
                padding: '10px',
              }}>
                {edu.logoImg
                  ? <img src={edu.logoImg} alt={edu.school} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                  : <span style={{ fontSize: '2rem' }}>{edu.logo}</span>}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ color: 'var(--text)', fontWeight: 800, fontSize: '1.2rem', marginBottom: '4px' }}>
                  {edu.school}
                </h3>
                <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>
                  {edu.degree}
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  {edu.duration}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
