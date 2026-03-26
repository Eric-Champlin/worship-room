import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  maxWidth?: string
}

export function Breadcrumb({ items, maxWidth }: BreadcrumbProps) {
  if (items.length === 0) return null

  const lastIndex = items.length - 1
  const showEllipsis = items.length >= 3

  return (
    <nav aria-label="Breadcrumb" className="py-2">
      <div className={cn('mx-auto px-4 sm:px-6', maxWidth ?? 'max-w-2xl')}>
        <ol className="flex items-center gap-1.5 text-xs sm:text-sm">
          {/* Ellipsis for mobile (shown only on < sm when 3+ items) */}
          {showEllipsis && (
            <li className="flex items-center gap-1.5 sm:hidden" aria-hidden="true">
              <span className="text-white/30">&hellip;</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/30" aria-hidden="true" />
            </li>
          )}

          {items.map((item, index) => {
            const isLast = index === lastIndex
            // On mobile, hide early items (all except last 2) when 3+ items
            const hideOnMobile = showEllipsis && index < items.length - 2

            return (
              <li
                key={index}
                className={cn(
                  'flex items-center gap-1.5',
                  hideOnMobile && 'hidden sm:flex'
                )}
              >
                {/* Separator before item (except first visible) */}
                {index > 0 && (
                  <ChevronRight
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 text-white/30',
                      showEllipsis && !isLast && 'hidden sm:block'
                    )}
                    aria-hidden="true"
                  />
                )}

                {isLast ? (
                  <span className="text-white/80" aria-current="page">
                    {item.label}
                  </span>
                ) : (
                  <Link
                    to={item.href!}
                    className="text-white/50 hover:text-white/70 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
