import { Link } from 'react-router-dom'
import { HandMetal, PenLine, Wind, Check } from 'lucide-react'
import { useCompletionTracking } from '@/hooks/useCompletionTracking'
import { cn } from '@/lib/utils'

interface MiniHubCardsProps {
  className?: string
}

const practices = [
  { label: 'Pray', to: '/pray', icon: HandMetal },
  { label: 'Journal', to: '/journal', icon: PenLine },
  { label: 'Meditate', to: '/meditate', icon: Wind },
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
            className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm transition-colors hover:bg-gray-50"
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
            <span className="font-medium text-text-dark">{label}</span>
          </Link>
        )
      })}
    </div>
  )
}
