import { cn } from '@/lib/utils'

interface GlowBackgroundProps {
  children: React.ReactNode
  variant?: 'center' | 'left' | 'right' | 'split' | 'none'
  className?: string
}

const PURPLE_GLOW = 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)'
const WHITE_GLOW = 'radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, transparent 70%)'

const ORB_BASE =
  'absolute rounded-full w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] lg:w-[600px] lg:h-[600px] animate-glow-float motion-reduce:animate-none'

function GlowOrbs({ variant }: { variant: 'center' | 'left' | 'right' | 'split' }) {
  if (variant === 'split') {
    return (
      <>
        <div
          data-testid="glow-orb"
          className={cn(ORB_BASE, 'top-[40%] left-[25%] -translate-x-1/2 -translate-y-1/2')}
          style={{ background: PURPLE_GLOW }}
          aria-hidden="true"
        />
        <div
          data-testid="glow-orb"
          className={cn(ORB_BASE, 'top-[40%] left-[75%] -translate-x-1/2 -translate-y-1/2')}
          style={{ background: WHITE_GLOW }}
          aria-hidden="true"
        />
      </>
    )
  }

  const positionClasses = {
    center: 'top-[30%] left-1/2 -translate-x-1/2',
    left: 'top-[40%] left-[20%] -translate-x-1/2 -translate-y-1/2',
    right: 'top-[40%] left-[80%] -translate-x-1/2 -translate-y-1/2',
  }

  return (
    <div
      data-testid="glow-orb"
      className={cn(ORB_BASE, positionClasses[variant])}
      style={{ background: PURPLE_GLOW }}
      aria-hidden="true"
    />
  )
}

export function GlowBackground({
  children,
  variant = 'center',
  className,
}: GlowBackgroundProps) {
  return (
    <div className={cn('relative overflow-hidden bg-hero-bg', className)}>
      {variant !== 'none' && <GlowOrbs variant={variant} />}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
