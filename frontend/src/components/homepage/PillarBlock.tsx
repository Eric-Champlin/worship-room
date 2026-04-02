import { useState } from 'react'
import { cn } from '@/lib/utils'
import { staggerDelay } from '@/hooks/useScrollReveal'
import { ACCENT_CLASSES } from './pillar-data'
import type { Pillar } from './pillar-data'
import { PillarAccordionItem } from './PillarAccordionItem'

interface PillarBlockProps {
  pillar: Pillar
  isVisible: boolean
}

export function PillarBlock({ pillar, isVisible }: PillarBlockProps) {
  const [expandedIndex, setExpandedIndex] = useState<number>(0)
  const accentClasses = ACCENT_CLASSES[pillar.accent]
  const Icon = pillar.icon

  return (
    <div>
      <div
        className={cn('scroll-reveal', isVisible && 'is-visible')}
        style={staggerDelay(0)}
      >
        <div className="flex items-center gap-3">
          <Icon className={cn('w-8 h-8 sm:w-10 sm:h-10', accentClasses.text)} aria-hidden="true" />
          <h3 className="text-2xl sm:text-3xl font-bold text-white">{pillar.title}</h3>
        </div>
        <p className="text-white/50 text-sm sm:text-base mt-1">{pillar.subtitle}</p>
      </div>
      <div className="mt-4">
        {pillar.features.map((feature, i) => (
          <PillarAccordionItem
            key={feature.previewKey}
            feature={feature}
            accent={pillar.accent}
            isExpanded={expandedIndex === i}
            onToggle={() => setExpandedIndex(prev => (prev === i ? -1 : i))}
            index={i}
            isVisible={isVisible}
          />
        ))}
      </div>
    </div>
  )
}
