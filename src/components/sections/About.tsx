import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { portfolioData } from '@/data/portfolio'
import { RevealText, Reveal, ImageReveal } from '@/components/ui/Reveal'
import { GithubIcon, LinkedinIcon } from '@/components/ui/SocialIcons'
import { Mail } from 'lucide-react'

// Everything here is from the existing introduction, experience and education entries.
const sentences = portfolioData.subTitle.split(/(?<=\.)\s+/)
const STATEMENT = sentences[0]
const DETAIL = sentences.slice(1, -1).join(' ')
const STACK = sentences.at(-1)!.replace(/^Stack:\s*/, '').replace(/\.$/, '')
const current = portfolioData.experiences[0]
const edu = portfolioData.education[0]

const FACTS = [
  { k: 'Based in', v: portfolioData.location },
  { k: 'Current role', v: `${current.role} · ${current.company}` },
  { k: 'Education', v: `${edu.degree.replace('Bachelor of Science in', 'B.Sc.')} · ${edu.duration.replace(' — ', '–')}` },
  { k: 'Focus', v: portfolioData.whatIDo.subtitle.split(',')[0].toLowerCase().replace(/^./, (c) => c.toUpperCase()) },
  { k: 'Stack', v: STACK },
  { k: 'Availability', v: portfolioData.openToOpportunities ? 'Open to opportunities' : 'Not available' },
]

export const About = () => {
  const card = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: card, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['-6%', '6%'])

  return (
    <section id="about" className="section about" tabIndex={-1}>
      <div className="container">
        <header className="about__head">
          <Reveal><span className="eyebrow"><b>01</b> About</span></Reveal>
          <RevealText as="h2" text="About me" className="title-xl" />
          <motion.span className="about__rule" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} aria-hidden="true" />
        </header>

        <div className="about__grid">
          <div ref={card} className="about__portrait" data-cursor="hover">
            <motion.div style={{ y, height: '112%', marginTop: '-6%' }}>
              <ImageReveal src="/images/portrait-960.jpg" srcSet="/images/portrait-480.jpg 480w, /images/portrait-960.jpg 960w" webpSrcSet="/images/portrait-480.webp 480w, /images/portrait-960.webp 960w" sizes="(max-width: 860px) 90vw, 32vw" alt={`Portrait of ${portfolioData.name}`} width={960} height={1200} className="about__img" style={{ height: '100%' }} />
            </motion.div>
            <span className="about__name">{portfolioData.name}</span>
            <div className="about__social">
              <a href={portfolioData.githubLink} target="_blank" rel="noopener noreferrer" aria-label="GitHub"><GithubIcon size={16} /></a>
              <a href={portfolioData.linkedinLink} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><LinkedinIcon size={16} /></a>
              <a href={`mailto:${portfolioData.contactEmail}`} aria-label="Email"><Mail size={16} /></a>
            </div>
          </div>

          <div className="about__copy">
            <Reveal><span className="eyebrow">Who I am</span></Reveal>
            <RevealText as="p" text={STATEMENT} className="title-lg about__statement" highlight={['llm-integrated', 'applications', 'python', 'typescript']} stagger={0.03} />
            <div className="about__cols">
              <Reveal delay={0.1}><p className="body">{DETAIL}</p></Reveal>
              <Reveal delay={0.2}><p className="body">{portfolioData.contactBlurb.split('. ').slice(1, 2).join('. ')}.</p></Reveal>
            </div>
            <dl className="about__facts">
              {FACTS.map((f, i) => (
                <Reveal key={f.k} delay={0.05 * i} className="about__fact">
                  <dt className="label">{f.k}</dt>
                  <dd>{f.v}</dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}
