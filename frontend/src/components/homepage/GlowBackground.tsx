import { cn } from '@/lib/utils'

interface GlowBackgroundProps {
  children: React.ReactNode
  variant?: 'center' | 'left' | 'right' | 'split' | 'fullPage' | 'none'
  className?: string
  glowOpacity?: number
}

const GLOW_CONFIG = {
  center: [
    {
      opacity: 0.25,
      color: '139, 92, 246',
      size: 'w-[300px] h-[300px] md:w-[600px] md:h-[600px]',
      position: 'top-[30%] left-1/2 -translate-x-1/2',
    },
    {
      opacity: 0.18,
      color: '168, 130, 255',
      size: 'w-[250px] h-[250px] md:w-[450px] md:h-[450px]',
      position: 'top-[60%] left-[80%] -translate-x-1/2',
    },
  ],
  left: [
    {
      opacity: 0.22,
      color: '139, 92, 246',
      size: 'w-[300px] h-[300px] md:w-[500px] md:h-[500px]',
      position: 'top-[40%] left-[20%] -translate-x-1/2 -translate-y-1/2',
    },
    {
      opacity: 0.16,
      color: '186, 156, 255',
      size: 'w-[250px] h-[250px] md:w-[400px] md:h-[400px]',
      position: 'top-[70%] left-[70%] -translate-x-1/2 -translate-y-1/2',
    },
  ],
  right: [
    {
      opacity: 0.22,
      color: '139, 92, 246',
      size: 'w-[300px] h-[300px] md:w-[500px] md:h-[500px]',
      position: 'top-[40%] left-[80%] -translate-x-1/2 -translate-y-1/2',
    },
    {
      opacity: 0.16,
      color: '186, 156, 255',
      size: 'w-[250px] h-[250px] md:w-[400px] md:h-[400px]',
      position: 'top-[70%] left-[30%] -translate-x-1/2 -translate-y-1/2',
    },
  ],
  split: [
    {
      opacity: 0.24,
      color: '139, 92, 246',
      size: 'w-[300px] h-[300px] md:w-[500px] md:h-[500px]',
      position: 'top-[40%] left-[25%] -translate-x-1/2 -translate-y-1/2',
    },
    {
      opacity: 0.18,
      color: '168, 130, 255',
      size: 'w-[250px] h-[250px] md:w-[400px] md:h-[400px]',
      position: 'top-[40%] left-[75%] -translate-x-1/2 -translate-y-1/2',
    },
    {
      opacity: 0.14,
      color: '186, 156, 255',
      size: 'w-[200px] h-[200px] md:w-[350px] md:h-[350px]',
      position: 'top-[75%] left-[50%] -translate-x-1/2 -translate-y-1/2',
    },
  ],
  fullPage: [
    // Near hero (top viewport)
    {
      opacity: 0.25,
      color: '139, 92, 246',
      size: 'w-[300px] h-[300px] md:w-[600px] md:h-[600px]',
      position: 'top-[5%] left-1/2 -translate-x-1/2',
    },
    // Upper-right, roughly behind pillars section
    {
      opacity: 0.18,
      color: '168, 130, 255',
      size: 'w-[250px] h-[250px] md:w-[450px] md:h-[450px]',
      position: 'top-[30%] left-[85%] -translate-x-1/2',
    },
    // Mid-left, behind dashboard preview / spotlight
    {
      opacity: 0.2,
      color: '139, 92, 246',
      size: 'w-[280px] h-[280px] md:w-[500px] md:h-[500px]',
      position: 'top-[55%] left-[10%] -translate-x-1/2',
    },
    // Lower-right, behind differentiator checklist
    {
      opacity: 0.16,
      color: '186, 156, 255',
      size: 'w-[250px] h-[250px] md:w-[400px] md:h-[400px]',
      position: 'top-[75%] left-[80%] -translate-x-1/2',
    },
    // Near bottom, behind final CTA
    {
      opacity: 0.22,
      color: '139, 92, 246',
      size: 'w-[260px] h-[260px] md:w-[500px] md:h-[500px]',
      position: 'top-[92%] left-[50%] -translate-x-1/2',
    },
  ],
} as const

const ORB_BASE =
  'absolute rounded-full pointer-events-none will-change-transform blur-[60px] md:blur-[80px] animate-glow-float motion-reduce:animate-none'

function GlowOrbs({ variant, glowOpacity }: { variant: 'center' | 'left' | 'right' | 'split' | 'fullPage'; glowOpacity?: number }) {
  const orbs = GLOW_CONFIG[variant]
  // glowOpacity acts as a multiplier on each orb's configured opacity
  const multiplier = glowOpacity != null ? glowOpacity / orbs[0].opacity : 1
  return (
    <>
      {orbs.map((orb, i) => (
        <div
          key={i}
          data-testid="glow-orb"
          className={cn(ORB_BASE, orb.size, orb.position)}
          style={{
            background: `radial-gradient(circle, rgba(${orb.color}, ${orb.opacity * multiplier}) 0%, transparent 70%)`,
          }}
          aria-hidden="true"
        />
      ))}
    </>
  )
}

export function GlowBackground({
  children,
  variant = 'center',
  className,
  glowOpacity,
}: GlowBackgroundProps) {
  return (
    <div className={cn('relative overflow-clip bg-hero-bg', className)}>
      {variant !== 'none' && <GlowOrbs variant={variant} glowOpacity={glowOpacity} />}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
