import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { POPULAR_TOPICS } from '@/constants/ask'

interface PopularTopicsSectionProps {
  onTopicClick: (starterQuestion: string) => void
}

export function PopularTopicsSection({ onTopicClick }: PopularTopicsSectionProps) {
  return (
    <div className="mt-8">
      <h2 className="mb-4 text-lg font-semibold text-text-dark">Popular Topics</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {POPULAR_TOPICS.map((topic) => (
          <button
            key={topic.topic}
            type="button"
            onClick={() => onTopicClick(topic.starterQuestion)}
            className={cn(
              'flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 text-left',
              'shadow-sm hover:shadow-md transition-shadow cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              'min-h-[44px]',
            )}
          >
            <div>
              <p className="font-semibold text-text-dark">{topic.topic}</p>
              <p className="mt-1 text-sm text-text-light">{topic.description}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-text-light" />
          </button>
        ))}
      </div>
    </div>
  )
}
