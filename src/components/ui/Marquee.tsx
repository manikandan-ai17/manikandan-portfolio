import type { CSSProperties, ReactNode } from 'react'

/** An endless horizontal ticker. The content is repeated so the loop never shows a gap; copies are hidden from screen readers. */
export function Marquee({ children, speed = 40, gap = 48, reverse = false, className = '', style, label }: {
  children: ReactNode; speed?: number; gap?: number; reverse?: boolean; className?: string; style?: CSSProperties; label?: string
}) {
  const vars = { '--marquee-speed': `${speed}s`, '--marquee-gap': `${gap}px`, ...style } as CSSProperties
  return (
    <div className={`marquee ${reverse ? 'marquee--reverse' : ''} ${className}`} style={vars} role={label ? 'region' : undefined} aria-label={label}>
      <div className="marquee__track">{children}</div>
      <div className="marquee__track" aria-hidden="true">{children}</div>
    </div>
  )
}
