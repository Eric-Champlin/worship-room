import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface BackgroundCanvasProps {
  children: ReactNode
  className?: string
  /**
   * Spec 6.3 — Night Mode marker. When provided, the outer div receives
   * `data-night-mode={value}`. Used only by `/prayer-wall` to scope night-mode
   * CSS to the Prayer Wall surface. Always passed as `'on'` or `'off'` (never
   * undefined when active) so CSS rules under `[data-night-mode='on']` fire
   * while keeping the off-state attribute as a stable hook for E2E tests.
   */
  nightMode?: 'on' | 'off'
}

const CANVAS_BACKGROUND = `
  radial-gradient(ellipse 50% 35% at 50% 8%, rgba(167,139,250,0.10) 0%, transparent 60%),
  radial-gradient(ellipse 45% 30% at 80% 50%, rgba(167,139,250,0.06) 0%, transparent 65%),
  radial-gradient(ellipse 50% 35% at 20% 88%, rgba(167,139,250,0.08) 0%, transparent 65%),
  radial-gradient(ellipse 70% 55% at 60% 50%, rgba(0,0,0,0.65) 0%, transparent 70%),
  linear-gradient(135deg, #120A1F 0%, #08051A 50%, #0A0814 100%)
`

export function BackgroundCanvas({ children, className, nightMode }: BackgroundCanvasProps) {
  return (
    <div
      data-testid="background-canvas"
      data-night-mode={nightMode}
      // overflow-x-clip (NOT overflow-hidden) — clip prevents horizontal scrollbars
      // from atmospheric gradient blooms without creating a scroll container, so
      // descendants with `position: sticky` engage against the viewport.
      // overflow: hidden traps sticky; overflow: clip does not. See spec 4.8 verification.
      className={cn('relative min-h-screen overflow-x-clip', className)}
      style={{ background: CANVAS_BACKGROUND }}
    >
      {children}
    </div>
  )
}
