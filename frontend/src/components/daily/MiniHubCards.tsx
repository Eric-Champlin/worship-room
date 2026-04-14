import { Link } from 'react-router-dom'
import { HandMetal, PenLine, Wind, Check } from 'lucide-react'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import { cn } from '@/lib/utils'

interface MiniHubCardsProps {
  className?: string
}

const practices = [
  { label: 'Pray', to: '/daily?tab=pray', icon: HandMetal },
  { label: 'Journal', to: '/daily?tab=journal', icon: PenLine },
  { label: 'Meditate', to: '/daily?tab=meditate', icon: Wind },
] as const

export function MiniHubCards({ className }: MiniHubCardsProps) {
  const { isPrayComplete, isJournalComplete, isMeditateComplete } =
    useCompletionTracking()

  const completionMap: Record<string, boolean> = {
    Pray: isPrayComplete,
    Journal: isJournalComplete,
    Meditate: isMeditateComplete,
  }

  return (
    <div className={cn('flex items-center justify-center gap-3', className)}>
      {practices.map(({ label, to, icon: Icon }) => {
        const isComplete = completionMap[label]
        return (
          <Link
            key={label}
            to={to}
            className="flex flex-col items-center gap-1 rounded-lg border border-white/[0.12] bg-white/[0.06] px-4 py-3 text-sm transition-colors hover:bg-white/10"
          >
            <div className="relative">
              <Icon className="h-5 w-5 text-primary" />
              {isComplete && (
                <Check
                  className="absolute -right-2 -top-2 h-3.5 w-3.5 rounded-full bg-success text-white"
                  aria-label={`${label} completed`}
                />
              )}
            </div>
            <span className="font-medium text-white">{label}</span>
          </Link>
        )
      })}
    </div>
  )
}
