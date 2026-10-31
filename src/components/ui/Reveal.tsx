import { motion, useInView, useReducedMotion, type Variants } from 'framer-motion'
import { useRef, type ElementType, type ReactNode, type CSSProperties } from 'react'

import { EASE } from '@/lib/motion'

/** Words rise out of a mask, one after another, when the text scrolls into view. */
export function RevealText({
  text, as: Tag = 'span', className, style, delay = 0, stagger = 0.045, highlight = [], once = true, immediate = false,
}: {
  text: string
  as?: ElementType
  className?: string
  style?: CSSProperties
  delay?: number
  stagger?: number
  /** Words (case-insensitive, punctuation ignored) drawn in the accent colour. */
  highlight?: string[]
  once?: boolean
  /** Animate on mount instead of on scroll (for the hero). */
  immediate?: boolean
}) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once, margin: '0px 0px -12% 0px' })
  const reduce = useReducedMotion()
  const show = immediate || inView
  const hl = new Set(highlight.map((w) => w.toLowerCase()))
  const words = text.split(' ')
  return (
    <Tag ref={ref} className={className} style={style} aria-label={text}>
      {words.map((w, i) => {
        const key = w.toLowerCase().replace(/[^a-z0-9+#.-]/g, '').replace(/\.$/, '')
        return (
          <span key={i} className="word-mask" aria-hidden="true">
            <motion.span
              style={{ display: 'inline-block', color: hl.has(key) ? 'var(--accent)' : undefined }}
              initial={reduce ? false : { y: '110%' }}
              animate={show ? { y: '0%' } : undefined}
              transition={{ duration: 0.9, ease: EASE, delay: delay + i * stagger }}
            >
              {w}
            </motion.span>
            {i < words.length - 1 ? ' ' : null}
          </span>
        )
      })}
    </Tag>
  )
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 36 },
  visible: (d: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE, delay: d } }),
}

/** A block that fades and rises into place. */
export function Reveal({ children, delay = 0, className, style, as = 'div' }: { children: ReactNode; delay?: number; className?: string; style?: CSSProperties; as?: 'div' | 'li' | 'article' | 'section' | 'p' | 'span' }) {
  const reduce = useReducedMotion()
  const M = motion[as] as typeof motion.div
  return (
    <M className={className} style={style} variants={fadeUp} initial={reduce ? false : 'hidden'} whileInView="visible" viewport={{ once: true, margin: '0px 0px -10% 0px' }} custom={delay}>
      {children}
    </M>
  )
}

/** An image that is uncovered by a sliding mask, with a slow settle in scale. */
export function ImageReveal({ src, srcSet, webpSrcSet, sizes, alt, className, style, imgStyle, delay = 0, width, height, loading = 'lazy' }: {
  src: string; srcSet?: string; webpSrcSet?: string; sizes?: string; alt: string; className?: string; style?: CSSProperties; imgStyle?: CSSProperties; delay?: number; width?: number; height?: number; loading?: 'lazy' | 'eager'
}) {
  const reduce = useReducedMotion()
  // Watch the unclipped outer box: browsers treat an element hidden by its own clip-path as not visible,
  // so observing the masked element itself would never trigger.
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const shown = reduce || inView
  return (
    <div ref={ref} className={className} style={style}>
      <motion.div
        style={{ overflow: 'hidden', width: '100%', height: '100%' }}
        initial={reduce ? false : { clipPath: 'inset(100% 0% 0% 0%)' }}
        animate={shown ? { clipPath: 'inset(0% 0% 0% 0%)' } : undefined}
        transition={{ duration: 1.2, ease: EASE, delay }}
      >
        <picture style={{ display: 'contents' }}>
          {webpSrcSet && <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} />}
          <motion.img
            src={src}
            srcSet={srcSet}
            sizes={sizes}
            alt={alt}
            width={width}
            height={height}
            loading={loading}
            decoding="async"
            style={{ width: '100%', height: '100%', objectFit: 'cover', ...imgStyle }}
            initial={reduce ? false : { scale: 1.18 }}
            animate={shown ? { scale: 1 } : undefined}
            transition={{ duration: 1.6, ease: EASE, delay }}
          />
        </picture>
      </motion.div>
    </div>
  )
}
