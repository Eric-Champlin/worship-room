import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { staggerDelay } from '@/hooks/useScrollReveal'
import { ACCENT_CLASSES } from './pillar-data'
import type { PillarFeature, PillarAccent } from './pillar-data'

interface PillarAccordionItemProps {
  feature: PillarFeature
  accent: PillarAccent
  isExpanded: boolean
  onToggle: () => void
  index: number
  isVisible: boolean
}

const MOOD_COLORS = ['#D97706', '#C2703E', '#8B7FA8', '#2DD4BF', '#34D399']

function renderPreview(previewKey: string, accent: PillarAccent) {
  const accentClasses = ACCENT_CLASSES[accent]

  switch (previewKey) {
    case 'devotional':
      return (
        <div className="w-[180px] rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
          <p className="font-script text-white/50 text-sm italic leading-snug">
            "The Lord is my shepherd; I shall not want."
          </p>
          <p className="text-white/30 text-xs mt-2">Psalm 23:1</p>
        </div>
      )

    case 'ai-prayer':
      return (
        <div className="w-[180px] space-y-1">
          <p className="text-white/80 text-xs leading-relaxed">
            Lord, I come to you today
          </p>
          <p className="text-white/80 text-xs leading-relaxed">
            with everything on my heart.
          </p>
          <p className="text-white/20 text-xs leading-relaxed">
            You know the weight I carry,
          </p>
          <p className="text-white/20 text-xs leading-relaxed">
            the questions I can't answer...
          </p>
        </div>
      )

    case 'journaling':
      return (
        <div className="w-[140px] space-y-2 py-1">
          <div className="h-px bg-white/10 w-full" />
          <div className="h-px bg-white/10 w-[85%]" />
          <div className="h-px bg-white/10 w-[70%]" />
          <svg
            className="w-4 h-4 text-white/20 mt-1"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
        </div>
      )

    case 'meditation':
      return (
        <div className="grid grid-cols-3 gap-2 w-fit">
          {['B', 'S', 'G', 'A', 'P', 'E'].map((letter, i) => (
            <div
              key={letter}
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium',
                i === 0
                  ? `${accentClasses.bg} ${accentClasses.text}`
                  : 'bg-white/[0.04] text-white/40'
              )}
            >
              {letter}
            </div>
          ))}
        </div>
      )

    case 'mood-checkin':
      return (
        <div className="flex items-center gap-2">
          {MOOD_COLORS.map((color, i) => (
            <div
              key={color}
              className={cn(
                'rounded-full transition-all',
                i === 2 ? 'w-3.5 h-3.5 ring-2 ring-white/20' : 'w-2.5 h-2.5 opacity-60'
              )}
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
          ))}
        </div>
      )

    case 'evening-reflection':
      return (
        <svg
          className="w-16 h-12"
          viewBox="0 0 64 48"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M20 32C20 22 28 14 38 14C36 14 34 12 34 10C34 12 32 14 30 14C20 14 12 22 12 32C12 38 16 43 22 45C18 43 16 38 20 32Z"
            fill="rgba(255,255,255,0.15)"
          />
          <circle cx="42" cy="12" r="1.5" className={accentClasses.text} fill="currentColor" />
          <circle cx="48" cy="20" r="1" fill="rgba(255,255,255,0.3)" />
          <circle cx="36" cy="8" r="1" fill="rgba(255,255,255,0.3)" />
        </svg>
      )

    case 'reading-plans':
      return (
        <div className="w-[160px]">
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500/60 to-emerald-400/80"
              style={{ width: '60%' }}
            />
          </div>
          <p className="text-white/40 text-xs mt-1.5">Day 5 of 21</p>
        </div>
      )

    case 'seasonal-challenges':
      return (
        <svg
          className={cn('w-10 h-10', accentClasses.text)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <path d="M9 15l2 2 4-4" />
        </svg>
      )

    case 'growth-garden':
      return (
        <svg
          className="w-12 h-14"
          viewBox="0 0 48 56"
          fill="none"
          aria-hidden="true"
        >
          <line x1="24" y1="56" x2="24" y2="24" stroke="rgba(74,222,128,0.5)" strokeWidth="2" />
          <ellipse cx="16" cy="32" rx="8" ry="5" fill="rgba(74,222,128,0.3)" />
          <ellipse cx="32" cy="28" rx="8" ry="5" fill="rgba(74,222,128,0.25)" />
          <ellipse cx="20" cy="22" rx="6" ry="4" fill="rgba(74,222,128,0.2)" />
          <ellipse cx="30" cy="18" rx="6" ry="4" fill="rgba(74,222,128,0.2)" />
          <circle cx="26" cy="12" r="4" fill="rgba(168,85,247,0.4)" />
        </svg>
      )

    case 'badges-points':
      return (
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              accentClasses.bg
            )}
          >
            <span className={cn('text-xs', accentClasses.text)}>&#9733;</span>
          </div>
          <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center overflow-hidden">
            <div
              className={cn('w-full h-1/2 self-end', accentClasses.bg)}
            />
          </div>
          <div className="w-8 h-8 rounded-full border border-white/10" />
        </div>
      )

    case 'insights':
      return (
        <svg
          className={cn('w-16 h-10', accentClasses.text)}
          viewBox="0 0 64 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="4,32 20,24 36,28 60,8" />
          <circle cx="4" cy="32" r="2" fill="currentColor" />
          <circle cx="20" cy="24" r="2" fill="currentColor" />
          <circle cx="36" cy="28" r="2" fill="currentColor" />
          <circle cx="60" cy="8" r="2" fill="currentColor" />
        </svg>
      )

    case 'prayer-wall':
      return (
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10" />
          <div className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/10 -ml-3" />
          <svg
            className={cn('w-4 h-4 ml-2', accentClasses.text)}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
      )

    case 'friends-encouragement':
      return (
        <div className="bg-white/[0.04] rounded-full px-3 py-1">
          <span className="text-white/40 text-xs">Sarah is thinking of you</span>
        </div>
      )

    case 'local-support':
      return (
        <svg
          className={cn('w-10 h-10', accentClasses.text)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          <path d="M12 7v4" />
          <path d="M10 9h4" />
        </svg>
      )

    default:
      return null
  }
}

export function PillarAccordionItem({
  feature,
  accent,
  isExpanded,
  onToggle,
  index,
  isVisible,
}: PillarAccordionItemProps) {
  const accentClasses = ACCENT_CLASSES[accent]
  const panelId = `pillar-panel-${feature.previewKey}`
  const triggerId = `pillar-trigger-${feature.previewKey}`

  return (
    <div
      className={cn('border-b border-white/[0.06] scroll-reveal', isVisible && 'is-visible')}
      style={staggerDelay(index, 80, 200)}
    >
      <button
        id={triggerId}
        type="button"
        className="flex items-center py-4 w-full cursor-pointer group"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={panelId}
      >
        <span
          className={cn(
            'rounded-full shrink-0 transition-all',
            accentClasses.bg,
            isExpanded
              ? `w-2.5 h-2.5 ring-2 ${accentClasses.ring}`
              : 'w-2 h-2'
          )}
          aria-hidden="true"
        />
        <span
          className={cn(
            'flex-1 text-left ml-3 transition-colors',
            isExpanded
              ? 'text-white font-semibold text-base sm:text-lg'
              : 'text-white/70 text-base sm:text-lg font-medium group-hover:text-white/90'
          )}
        >
          {feature.name}
        </span>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-white/30 transition-transform duration-200 group-hover:text-white/50 shrink-0',
            isExpanded && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        aria-hidden={!isExpanded}
        className="overflow-hidden transition-[max-height] duration-300 ease-out motion-reduce:transition-none"
        style={{ maxHeight: isExpanded ? '500px' : '0px' }}
      >
        <div className={cn('border-l-2 pl-4 pt-3 pb-6 ml-1', accentClasses.border)}>
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <p className="text-white/60 text-sm leading-relaxed max-w-xl">
              {feature.description}
            </p>
            <div className="shrink-0">{renderPreview(feature.previewKey, accent)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
