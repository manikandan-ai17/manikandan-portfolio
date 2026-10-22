import { motion, type Variants } from 'framer-motion'
import { type ReactNode, type CSSProperties } from 'react'

export type Direction = 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade' | 'flip' | 'slideUp'

const spring = { type: 'spring' as const, stiffness: 90, damping: 18, mass: 0.9 } as const
const springFast = { type: 'spring' as const, stiffness: 130, damping: 20, mass: 0.7 } as const

function makeVariants(dir: Direction): Variants {
  const map: Record<Direction, { hidden: object; visible: object }> = {
    up:      { hidden: { opacity: 0, y: 60, scale: 0.97 },         visible: { opacity: 1, y: 0, scale: 1, transition: spring } },
    down:    { hidden: { opacity: 0, y: -50 },                      visible: { opacity: 1, y: 0, transition: spring } },
    left:    { hidden: { opacity: 0, x: -70 },                      visible: { opacity: 1, x: 0, transition: spring } },
    right:   { hidden: { opacity: 0, x: 70 },                       visible: { opacity: 1, x: 0, transition: spring } },
    scale:   { hidden: { opacity: 0, scale: 0.7, y: 20 },           visible: { opacity: 1, scale: 1, y: 0, transition: springFast } },
    fade:    { hidden: { opacity: 0 },                               visible: { opacity: 1, transition: { duration: 0.7 } } },
    flip:    { hidden: { opacity: 0, rotateY: 80, scale: 0.9 },     visible: { opacity: 1, rotateY: 0, scale: 1, transition: spring } },
    slideUp: { hidden: { opacity: 0, y: 80, rotateX: 12 },          visible: { opacity: 1, y: 0, rotateX: 0, transition: spring } },
  }
  return map[dir] as Variants
}

interface RevealProps {
  children: ReactNode
  direction?: Direction
  delay?: number
  className?: string
  style?: CSSProperties
}

export const ScrollReveal = ({ children, direction = 'up', delay = 0, className, style }: RevealProps) => {
  const v = makeVariants(direction)
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-70px' }}
      variants={{
        hidden: v.hidden,
        visible: {
          ...(v.visible as object),
          transition: { ...(v.visible as { transition?: object }).transition, delay },
        },
      }}
      style={{ perspective: '1200px', ...style }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export const StaggerContainer = ({
  children, className, style, stagger = 0.1,
}: {
  children: ReactNode; className?: string; style?: CSSProperties; stagger?: number
}) => (
  <motion.div
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: '-50px' }}
    variants={{
      hidden: {},
      visible: { transition: { staggerChildren: stagger, delayChildren: 0.08 } },
    }}
    style={style}
    className={className}
  >
    {children}
  </motion.div>
)

export const StaggerItem = ({
  children, direction = 'up', style,
}: {
  children: ReactNode; direction?: Direction; style?: CSSProperties
}) => (
  <motion.div
    variants={makeVariants(direction)}
    style={{ perspective: '1200px', ...style }}
  >
    {children}
  </motion.div>
)

// Word-by-word text reveal
export const TextReveal = ({
  text, className, style,
}: {
  text: string; className?: string; style?: CSSProperties
}) => {
  const words = text.split(' ')
  return (
    <motion.span
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } }}
      className={className}
      style={{ display: 'inline', ...style }}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          variants={{
            hidden: { opacity: 0, y: 22, skewY: 4 },
            visible: {
              opacity: 1, y: 0, skewY: 0,
              transition: { type: 'spring' as const, stiffness: 120, damping: 18 },
            },
          }}
          style={{ display: 'inline-block', marginRight: '0.28em' }}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  )
}
