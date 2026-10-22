import React from 'react'
import { motion } from 'framer-motion'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  delay?: number
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hover = true,
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      whileHover={hover ? { y: -4 } : undefined}
      className={`glass rounded-2xl p-6 transition-all duration-300 ${className}`}
    >
      {children}
    </motion.div>
  )
}
