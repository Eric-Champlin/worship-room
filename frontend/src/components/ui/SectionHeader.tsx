import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface SectionHeaderProps {
  children: ReactNode
  icon?: ReactNode
  as?: 'h2' | 'h3'
  action?: ReactNode
  className?: string
  id?: string
}

export function SectionHeader({
  children,
  icon,
  as: Tag = 'h2',
  action,
  className,
  id,
}: SectionHeaderProps) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)}>
      <Tag
        id={id}
        className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/50"
      >
        {icon}
        <span>{children}</span>
      </Tag>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
