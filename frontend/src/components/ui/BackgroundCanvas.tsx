import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface BackgroundCanvasProps {
  children: ReactNode
  className?: string
}

const CANVAS_BACKGROUND = `
  radial-gradient(ellipse 50% 35% at 50% 8%, rgba(167,139,250,0.10) 0%, transparent 60%),
  radial-gradient(ellipse 45% 30% at 80% 50%, rgba(167,139,250,0.06) 0%, transparent 65%),
  radial-gradient(ellipse 50% 35% at 20% 88%, rgba(167,139,250,0.08) 0%, transparent 65%),
  radial-gradient(ellipse 70% 55% at 60% 50%, rgba(0,0,0,0.65) 0%, transparent 70%),
  linear-gradient(135deg, #120A1F 0%, #08051A 50%, #0A0814 100%)
`

export function BackgroundCanvas({ children, className }: BackgroundCanvasProps) {
  return (
    <div
      className={cn('relative min-h-screen overflow-hidden', className)}
      style={{ background: CANVAS_BACKGROUND }}
    >
      {children}
    </div>
  )
}
