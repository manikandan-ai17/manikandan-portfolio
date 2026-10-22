import type { StatusTone } from '@/data/portfolio'

export function StatusPill({ tone, children }: { tone: StatusTone; children: string }) {
  return <span className={`pill pill--${tone}`}>{children}</span>
}
