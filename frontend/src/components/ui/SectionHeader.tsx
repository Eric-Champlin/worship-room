import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

/**
 * Shared section-header primitive.
 *
 * Variants:
 *  - `default` (implicit) — small uppercase tracked-wide label. Renders a flex
 *    wrapper that hosts optional `icon` (before children) and optional `action`
 *    (right-aligned).
 *  - `gradient` — large centered heading using the white-to-purple
 *    `GRADIENT_TEXT_STYLE` gradient clip, sized one tier below `PageHero`
 *    (`text-3xl sm:text-4xl lg:text-5xl`). The gradient variant intentionally
 *    renders the `<Tag>` directly (no wrapper div); `icon` and `action` props
 *    are silently ignored.
 */
export interface SectionHeaderProps {
  children: ReactNode
  icon?: ReactNode
  as?: 'h2' | 'h3'
  action?: ReactNode
  className?: string
  id?: string
  variant?: 'default' | 'gradient'
}

export function SectionHeader({
  children,
  icon,
  as: Tag = 'h2',
  action,
  className,
  id,
  variant = 'default',
}: SectionHeaderProps) {
  if (variant === 'gradient') {
    return (
      <Tag
        id={id}
        className={cn(
          'mb-4 text-center text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl',
          className,
        )}
        style={GRADIENT_TEXT_STYLE}
      >
        {children}
      </Tag>
    )
  }

  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)}>
      <Tag
        id={id}
        className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white"
      >
        {icon}
        <span>{children}</span>
      </Tag>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
