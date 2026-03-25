import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { POPULAR_TOPICS } from '@/constants/ask'

interface PopularTopicsSectionProps {
  onTopicClick: (starterQuestion: string) => void
}

export function PopularTopicsSection({ onTopicClick }: PopularTopicsSectionProps) {
  return (
    <div className="mt-8">
      <h2 className="mb-4 text-lg font-semibold text-white">Popular Topics</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {POPULAR_TOPICS.map((topic) => (
          <button
            key={topic.topic}
            type="button"
            onClick={() => onTopicClick(topic.starterQuestion)}
            className={cn(
              'flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.06] p-4 text-left',
              'hover:bg-white/[0.08] transition-colors cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              'min-h-[44px]',
            )}
          >
            <div>
              <p className="font-semibold text-white/80">{topic.topic}</p>
              <p className="mt-1 text-sm text-white/50">{topic.description}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-white/40" />
          </button>
        ))}
      </div>
    </div>
  )
}
