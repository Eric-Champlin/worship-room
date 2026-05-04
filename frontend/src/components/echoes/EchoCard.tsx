import { Bookmark, Calendar, Highlighter } from 'lucide-react'
import { Link } from 'react-router-dom'

import { FrostedCard } from '@/components/homepage/FrostedCard'
import type { Echo, EchoKind } from '@/types/echoes'

interface EchoCardProps {
  echo: Echo
  onNavigate?: () => void
}

const KIND_CONFIG: Record<EchoKind, { Icon: typeof Highlighter; verb: string }> = {
  highlighted: { Icon: Highlighter, verb: 'highlighted' },
  memorized: { Icon: Bookmark, verb: 'memorized' },
  'read-on-this-day': { Icon: Calendar, verb: 'read' },
}

export function EchoCard({ echo, onNavigate }: EchoCardProps) {
  const { Icon, verb } = KIND_CONFIG[echo.kind]

  const to =
    echo.startVerse > 0
      ? `/bible/${echo.book}/${echo.chapter}?verse=${echo.startVerse}`
      : `/bible/${echo.book}/${echo.chapter}`

  return (
    <Link
      to={to}
      onClick={() => onNavigate?.()}
      aria-label={`Echo: you ${verb} ${echo.reference} ${echo.relativeLabel}. Tap to open.`}
      className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
    >
      <FrostedCard
        variant="default"
        as="article"
        className="transition-all motion-reduce:transition-none duration-base ease-decelerate group-hover:bg-white/[0.10] group-hover:shadow-frosted-hover group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-y-0"
      >
        <div className="flex items-center gap-1.5 mb-3">
          <Icon className="h-3.5 w-3.5 text-white/30 shrink-0" />
          <span className="text-xs text-white/50">
            You {verb} this {echo.relativeLabel}
          </span>
        </div>

        {echo.text && (
          <p className="text-base text-white leading-relaxed font-serif">
            {echo.text}
          </p>
        )}

        <p className="text-sm text-white/60 mt-3 text-right">
          &mdash; {echo.reference}
        </p>
      </FrostedCard>
    </Link>
  )
}
