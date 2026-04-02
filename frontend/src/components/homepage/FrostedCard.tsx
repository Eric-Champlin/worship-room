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
        'bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6',
        'shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]',
        'transition-all duration-200 ease-out',
        isInteractive && [
          'cursor-pointer',
          'hover:bg-white/[0.09] hover:border-white/[0.18]',
          'hover:shadow-[0_0_35px_rgba(139,92,246,0.10),0_6px_25px_rgba(0,0,0,0.35)]',
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
