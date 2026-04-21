import { ChevronRight } from 'lucide-react'
import type { RefObject } from 'react'
import { cn } from '@/lib/utils'
import { POPULAR_TOPICS } from '@/constants/ask'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'

interface PopularTopicsSectionProps {
  onTopicClick: (starterQuestion: string) => void
}

export function PopularTopicsSection({ onTopicClick }: PopularTopicsSectionProps) {
  const sectionReveal = useScrollReveal({ threshold: 0.1 })

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-lg font-semibold text-white">Popular Topics</h2>
      <div
        ref={sectionReveal.ref as RefObject<HTMLDivElement>}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {POPULAR_TOPICS.map((topic, index) => (
          <div
            key={topic.topic}
            className={cn('scroll-reveal', sectionReveal.isVisible && 'is-visible')}
            style={staggerDelay(index, 60)}
          >
            <FrostedCard
              as="button"
              onClick={() => onTopicClick(topic.starterQuestion)}
              className="flex min-h-[44px] w-full items-center justify-between !p-4 text-left"
            >
              <div>
                <p className="font-semibold text-white">{topic.topic}</p>
                <p className="mt-1 text-sm text-white/80">{topic.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-white/60" aria-hidden="true" />
            </FrostedCard>
          </div>
        ))}
      </div>
    </div>
  )
}
