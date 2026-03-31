import { ChevronDown } from 'lucide-react'
import { useCallback, useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { getInitialCollapsed, setCollapseState } from '@/services/dashboard-collapse-storage'

interface DashboardCardProps {
  id: string
  title: string
  icon?: ReactNode
  collapsible?: boolean
  defaultCollapsed?: boolean
  action?: { label: string; to: string }
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}

export function DashboardCard({
  id,
  title,
  icon,
  collapsible = true,
  defaultCollapsed = false,
  action,
  children,
  className,
  style,
}: DashboardCardProps) {
  const [collapsed, setCollapsed] = useState(() =>
    getInitialCollapsed(id, defaultCollapsed),
  )
  const uniqueId = useId()
  const titleId = `card-title-${uniqueId}`
  const contentId = `card-content-${uniqueId}`

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      setCollapseState(id, next)
      return next
    })
  }, [id])

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6 transition-colors duration-150 hover:border-white/20 motion-reduce:transition-none',
        className,
      )}
      style={style}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-white/60" aria-hidden="true">
              {icon}
            </span>
          )}
          <h2
            id={titleId}
            className="text-base font-semibold text-white md:text-lg"
          >
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {action && (
            <Link
              to={action.to}
              className="text-sm text-primary transition-colors hover:text-primary-lt"
            >
              {action.label}
            </Link>
          )}
          {collapsible && (
            <button
              onClick={toggleCollapse}
              aria-expanded={!collapsed}
              aria-controls={contentId}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1 text-white/50 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
            >
              <ChevronDown
                className={cn(
                  'h-5 w-5 transition-transform duration-200 motion-reduce:transition-none',
                  !collapsed && 'rotate-180',
                )}
              />
            </button>
          )}
        </div>
      </div>

      <div
        id={contentId}
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-in-out motion-reduce:transition-none',
          collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="pt-3">{children}</div>
        </div>
      </div>
    </section>
  )
}
