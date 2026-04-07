import { BookOpen, Bookmark, ListChecks } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FrostedCard } from '@/components/homepage/FrostedCard'

const ACTIONS = [
  {
    icon: BookOpen,
    label: 'Browse Books',
    description: 'Explore all 66 books',
    route: '/bible/browse',
  },
  {
    icon: Bookmark,
    label: 'My Bible',
    description: 'Highlights, notes & bookmarks',
    route: '/bible/my',
  },
  {
    icon: ListChecks,
    label: 'Reading Plans',
    description: 'Guided daily reading',
    route: '/bible/plans',
  },
] as const

export function QuickActionsRow() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {ACTIONS.map((action) => (
        <FrostedCard key={action.route} as="article" className="min-h-[44px]">
          <Link to={action.route} className="flex flex-col items-center gap-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark">
            <action.icon className="h-6 w-6 text-white/70" aria-hidden="true" />
            <h3 className="text-base font-semibold text-white">{action.label}</h3>
            <p className="text-sm text-white/60">{action.description}</p>
          </Link>
        </FrostedCard>
      ))}
    </div>
  )
}
