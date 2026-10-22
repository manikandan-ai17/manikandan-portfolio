import { useRef, type ReactNode, type CSSProperties } from 'react'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'

interface TiltCardProps {
  children: ReactNode
  style?: CSSProperties
  className?: string
  intensity?: number
}

export const TiltCard = ({ children, style, className, intensity = 7 }: TiltCardProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const rotateX = useTransform(y, [-0.5, 0.5], [intensity, -intensity])
  const rotateY = useTransform(x, [-0.5, 0.5], [-intensity, intensity])

  const sRotX = useSpring(rotateX, { stiffness: 180, damping: 28 })
  const sRotY = useSpring(rotateY, { stiffness: 180, damping: 28 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: sRotX,
        rotateY: sRotY,
        transformStyle: 'preserve-3d',
        position: 'relative',
        height: '100%',
        ...style,
      }}
      className={className}
    >
      {/* Cursor glow highlight */}
      <motion.div
        style={{
          position: 'absolute', inset: 0,
          borderRadius: 'inherit',
          pointerEvents: 'none',
          zIndex: 1,
          opacity: 0,
          background: 'radial-gradient(circle at var(--gx) var(--gy), rgba(59,130,246,0.12), transparent 60%)',
        }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />
      {children}
    </motion.div>
  )
}
