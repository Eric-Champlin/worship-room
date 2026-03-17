import { BookOpen, Brain, Heart, Music } from 'lucide-react'
import { Link } from 'react-router-dom'

const ACTIONS = [
  { icon: Heart, label: 'Pray', to: '/daily?tab=pray' },
  { icon: BookOpen, label: 'Journal', to: '/daily?tab=journal' },
  { icon: Brain, label: 'Meditate', to: '/daily?tab=meditate' },
  { icon: Music, label: 'Music', to: '/music' },
] as const

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {ACTIONS.map(({ icon: Icon, label, to }) => (
        <Link
          key={label}
          to={to}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-white/80 transition-all hover:scale-[1.02] hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:hover:scale-100 md:p-6"
        >
          <Icon className="h-6 w-6 md:h-8 md:w-8" aria-hidden="true" />
          <span className="text-xs font-medium md:text-sm">{label}</span>
        </Link>
      ))}
    </div>
  )
}
