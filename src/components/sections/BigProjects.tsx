import { portfolioData } from '@/data/portfolio'
import { ArrowRight } from 'lucide-react'
import { GithubIcon } from '@/components/ui/SocialIcons'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal'
import { TiltCard } from '@/components/ui/TiltCard'

export const BigProjects = () => {
  const { bigProjects } = portfolioData

  return (
    <section id="projects" style={{ padding: '80px 0', background: 'var(--bg-secondary)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem' }}>
        <ScrollReveal direction="right">
          <h2 className="section-heading">Projects</h2>
          <p className="section-subheading">LLM-INTEGRATED APPLICATIONS, LABELLED WITH THEIR REAL STATUS</p>
        </ScrollReveal>

        <StaggerContainer className="grid-auto" stagger={0.1}>
          {bigProjects.map((project, i) => {
            const p = project as typeof project & {
              problem?: string
              llm?: string
              status?: string
              metrics?: string[]
              github?: string
            }
            return (
              <StaggerItem key={i} direction="flip">
                <TiltCard style={{ height: '100%' }}>
                  <motion.div
                    className="dev-card"
                    whileHover={{
                      y: -10,
                      boxShadow: '0 28px 70px rgba(37,99,235,0.22), 0 0 0 1px rgba(37,99,235,0.15)',
                      transition: { duration: 0.25 },
                    }}
                    style={{ overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}
                  >
                    {/* Image banner */}
                    <div style={{ width: '100%', overflow: 'hidden', borderRadius: '12px 12px 0 0', background: '#0d0f1a', flexShrink: 0, position: 'relative' }}>
                      {(p as any).image ? (
                        <>
                          <img
                            src={(p as any).image}
                            alt={project.name}
                            style={{ width: '100%', height: 'auto', display: 'block' }}
                          />
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.25))',
                            pointerEvents: 'none',
                          }} />
                        </>
                      ) : (
                        <div style={{ height: '200px', background: 'linear-gradient(135deg, #1565C0, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem' }}>
                          🤖
                        </div>
                      )}
                      {/* Status badge */}
                      {p.status && (
                        <div style={{
                          position: 'absolute', top: '12px', right: '12px',
                          background: 'rgba(16, 185, 129, 0.9)',
                          backdropFilter: 'blur(8px)',
                          color: '#fff', fontSize: '0.68rem', fontWeight: 700,
                          padding: '3px 10px', borderRadius: '100px',
                          fontFamily: "'JetBrains Mono', monospace",
                          letterSpacing: '0.5px', textTransform: 'uppercase',
                        }}>
                          {p.status}
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '20px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      {/* LLM badge */}
                      {p.llm && (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.2)',
                          borderRadius: '100px', padding: '3px 10px',
                          fontSize: '0.68rem', fontWeight: 700, color: '#60a5fa',
                          fontFamily: "'JetBrains Mono', monospace",
                          marginBottom: '10px', alignSelf: 'flex-start',
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#60a5fa', flexShrink: 0 }} />
                          {p.llm}
                        </div>
                      )}

                      <h3 style={{ color: 'var(--text)', fontWeight: 800, fontSize: '1.05rem', marginBottom: '6px' }}>
                        {project.name}
                      </h3>

                      {/* Problem statement */}
                      {p.problem && (
                        <p style={{
                          color: '#f59e0b', fontSize: '0.78rem', fontWeight: 600,
                          lineHeight: 1.5, marginBottom: '10px',
                          fontStyle: 'italic',
                        }}>
                          Problem: {p.problem}
                        </p>
                      )}

                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.7, marginBottom: '14px', flex: 1 }}>
                        {project.desc}
                      </p>

                      {/* Metrics */}
                      {p.metrics && p.metrics.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '16px' }}>
                          {p.metrics.map((m) => (
                            <span key={m} style={{
                              padding: '3px 9px',
                              background: 'rgba(255,255,255,0.05)',
                              color: 'var(--text-secondary)',
                              borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
                              border: '1px solid rgba(255,255,255,0.08)',
                              fontFamily: "'JetBrains Mono', monospace",
                            }}>{m}</span>
                          ))}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <Link
                          to={`/project/${(project as any).id}`}
                          style={{ textDecoration: 'none', flex: 1, minWidth: '120px' }}
                        >
                          <motion.span
                            className="btn-primary"
                            style={{ display: 'inline-flex', width: '100%', justifyContent: 'center', fontSize: '0.82rem', padding: '9px 16px', cursor: 'pointer' }}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            <ArrowRight size={14} />
                            Case Study
                          </motion.span>
                        </Link>
                        {p.github && (
                          <a
                            href={p.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none' }}
                          >
                            <motion.span
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '9px 14px', borderRadius: '10px', cursor: 'pointer',
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600,
                              }}
                              whileHover={{ scale: 1.03, background: 'rgba(255,255,255,0.1)' }}
                              whileTap={{ scale: 0.97 }}
                            >
                              <GithubIcon size={14} />
                            </motion.span>
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </TiltCard>
              </StaggerItem>
            )
          })}
        </StaggerContainer>
      </div>
    </section>
  )
}
