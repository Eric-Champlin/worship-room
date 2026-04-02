import { cn } from '@/lib/utils'

interface FrostedCardProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  as?: 'div' | 'button' | 'article'
}

export function FrostedCard({
  children,
  onClick,
  className,
  as: Component = 'div',
}: FrostedCardProps) {
  const isInteractive = !!onClick

  return (
    <Component
      onClick={onClick}
      className={cn(
        'bg-white/[0.05] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6',
        'transition-all duration-200 ease-out',
        isInteractive && [
          'cursor-pointer',
          'hover:bg-white/[0.08] hover:border-white/[0.12]',
          'hover:-translate-y-0.5',
          'motion-reduce:hover:translate-y-0',
        ],
        className
      )}
    >
      {children}
    </Component>
  )
}
