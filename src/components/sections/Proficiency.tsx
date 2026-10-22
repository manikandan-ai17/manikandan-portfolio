import { portfolioData } from '@/data/portfolio'
import { motion } from 'framer-motion'
import { ScrollReveal } from '@/components/ui/ScrollReveal'

const SkillCard = ({ domain, color, items, index }: {
  domain: string
  color: string
  items: string[]
  index: number
}) => (
  <motion.div
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.1, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
    style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: 'var(--shadow)',
    }}
  >
    {/* Colored accent bar */}
    <div style={{ height: '3px', background: color, borderRadius: '0' }} />

    <div style={{ padding: '20px 22px 24px' }}>
      {/* Domain header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}60` }} />
        <span style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.68rem',
          fontWeight: 600,
          color,
          textTransform: 'uppercase',
          letterSpacing: '2px',
        }}>
          {domain}
        </span>
      </div>

      {/* Technology list */}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {items.map((item, i) => (
          <motion.li
            key={item}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 + i * 0.05 + 0.2 }}
            style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}
          >
            <span style={{ color, flexShrink: 0, fontSize: '0.55rem', marginTop: '5px' }}>◆</span>
            {item}
          </motion.li>
        ))}
      </ul>
    </div>
  </motion.div>
)

export const Proficiency = () => {
  const { techSkills } = portfolioData as any

  return (
    <section id="tech-stack" style={{ padding: '80px 0', background: 'var(--bg-secondary)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem' }}>
        <ScrollReveal direction="up">
          <h2 className="section-heading">Technical Stack</h2>
          <p className="section-subheading">TECHNOLOGIES I BUILD WITH IN PRODUCTION</p>
        </ScrollReveal>

        <div className="grid-2col" style={{ gap: '20px' }}>
          {(techSkills || []).map((skill: any, i: number) => (
            <SkillCard
              key={skill.domain}
              domain={skill.domain}
              color={skill.color}
              items={skill.items}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
