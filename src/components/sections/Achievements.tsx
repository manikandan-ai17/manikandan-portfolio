import { portfolioData } from '@/data/portfolio'
import { motion } from 'framer-motion'
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal'
import { TiltCard } from '@/components/ui/TiltCard'

export const Achievements = () => {
  const { achievements } = portfolioData

  return (
    <section id="achievements" style={{ padding: '80px 0', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem' }}>
        <ScrollReveal direction="up">
          <h2 className="section-heading">Engineering Highlights</h2>
          <p className="section-subheading">DESIGN DECISIONS AND MEASURED RESULTS</p>
        </ScrollReveal>

        <StaggerContainer
          className="grid-3col"
          stagger={0.1}
        >
          {achievements.map((a, i) => (
            <StaggerItem key={i} direction="scale">
              <TiltCard style={{ height: '100%' }}>
                <motion.div
                  className="achievement-card"
                  whileHover={{
                    y: -10,
                    boxShadow: '0 24px 60px rgba(37,99,235,0.2), 0 0 0 1px rgba(37,99,235,0.12)',
                    transition: { duration: 0.25 },
                  }}
                  style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                >
                  {/* Image banner */}
                  <div style={{ width: '100%', overflow: 'hidden', borderRadius: '12px 12px 0 0', background: '#0d0f1a', flexShrink: 0, position: 'relative' }}>
                    {(a as any).image ? (
                      <>
                        <img
                          src={(a as any).image}
                          alt={a.title}
                          style={{ width: '100%', height: 'auto', display: 'block' }}
                        />
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.2))',
                          pointerEvents: 'none',
                        }} />
                      </>
                    ) : (
                      <div style={{
                        height: '180px',
                        background: `linear-gradient(135deg, ${['#1565C0, #2563eb', '#059669, #0d9488', '#7c3aed, #4f46e5'][i] || '#1565C0, #2563eb'})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem',
                      }}>
                        {a.emoji}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ color: 'var(--text)', fontWeight: 800, fontSize: '1rem', marginBottom: '10px', textAlign: 'center' }}>
                      {a.title}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.7, marginBottom: '14px', textAlign: 'center', flex: 1 }}>
                      {a.desc}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
                      {a.tags.map((tag) => (
                        <motion.span
                          key={tag}
                          whileHover={{ scale: 1.08 }}
                          style={{
                            padding: '4px 12px',
                            background: 'rgba(37,99,235,0.1)',
                            color: 'var(--primary)',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            border: '1px solid rgba(37,99,235,0.2)',
                            cursor: 'default',
                          }}
                        >
                          {tag}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </TiltCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
