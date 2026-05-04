import { BookOpen, Brain, Heart, Music } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { cn } from '@/lib/utils'

const ACTIONS = [
  { icon: Heart, label: 'Pray', to: '/daily?tab=pray', tonal: 'text-pink-300' },
  { icon: BookOpen, label: 'Journal', to: '/daily?tab=journal', tonal: 'text-sky-300' },
  { icon: Brain, label: 'Meditate', to: '/daily?tab=meditate', tonal: 'text-violet-300' },
  { icon: Music, label: 'Music', to: '/music', tonal: 'text-cyan-300' },
] as const

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {ACTIONS.map(({ icon: Icon, label, to, tonal }) => (
        <Link
          key={label}
          to={to}
          className="block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
        >
          <FrostedCard
            variant="subdued"
            className="flex flex-col items-center justify-center gap-2 transition-all duration-200 hover:bg-white/[0.08] motion-safe:hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
          >
            <Icon className={cn('h-6 w-6 md:h-8 md:w-8', tonal)} aria-hidden="true" />
            <span className="text-xs font-medium text-white md:text-sm">{label}</span>
          </FrostedCard>
        </Link>
      ))}
    </div>
  )
}
