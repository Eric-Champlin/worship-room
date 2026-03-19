import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  HandHeart,
  BookOpen,
  Users,
  PenLine,
  Wind,
  Headphones,
  Music,
  Sparkles,
  Heart,
  MessageCircleHeart,
  Megaphone,
  HeartHandshake,
} from 'lucide-react'
import type { MoodValue } from '@/types/dashboard'
import { MOOD_RECOMMENDATIONS } from '@/constants/dashboard/recommendations'
import { MOOD_COLORS } from '@/constants/dashboard/mood'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

const ICON_MAP: Record<string, LucideIcon> = {
  HandHeart,
  BookOpen,
  Users,
  PenLine,
  Wind,
  Headphones,
  Music,
  Sparkles,
  Heart,
  MessageCircleHeart,
  Megaphone,
  HeartHandshake,
}

const AUTO_ADVANCE_MS = 5000

interface MoodRecommendationsProps {
  moodValue: MoodValue
  onAdvanceToDashboard: () => void
}

export function MoodRecommendations({ moodValue, onAdvanceToDashboard }: MoodRecommendationsProps) {
  const prefersReduced = useReducedMotion()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigatedRef = useRef(false)

  const recommendations = MOOD_RECOMMENDATIONS[moodValue]
  const moodColor = MOOD_COLORS[moodValue]

  // Focus heading on mount for screen readers
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  // Auto-advance to dashboard after 5 seconds
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (!navigatedRef.current) {
        onAdvanceToDashboard()
      }
    }, AUTO_ADVANCE_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onAdvanceToDashboard])

  const handleCardClick = () => {
    navigatedRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  const handleSkipClick = () => {
    navigatedRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
    onAdvanceToDashboard()
  }

  return (
    <div
      role="region"
      aria-label="Recommended activities based on your mood"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(ellipse_at_50%_30%,_rgb(59,7,100)_0%,_transparent_60%),_linear-gradient(rgb(13,6,32)_0%,_rgb(30,11,62)_50%,_rgb(13,6,32)_100%)]"
    >
      <div className="flex w-full max-w-[600px] flex-col items-center px-4 lg:max-w-[800px]">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="mb-6 text-center font-serif italic text-xl text-white/80 outline-none motion-safe:animate-fade-in md:text-2xl"
        >
          Based on how you're feeling...
        </h2>

        <div className="flex w-full flex-col gap-3 sm:gap-4 lg:flex-row lg:gap-4">
          {recommendations.map((rec, index) => {
            const IconComponent = ICON_MAP[rec.icon]
            return (
              <Link
                key={rec.route}
                to={rec.route}
                onClick={handleCardClick}
                className={cn(
                  'flex min-h-[44px] items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 lg:flex-1 lg:flex-col lg:items-start lg:gap-2',
                  !prefersReduced && 'motion-safe:animate-fade-in opacity-0',
                )}
                style={{
                  borderLeftWidth: '4px',
                  borderLeftColor: moodColor,
                  animationDelay: !prefersReduced ? `${index * 150}ms` : undefined,
                  animationFillMode: !prefersReduced ? 'both' : undefined,
                }}
              >
                {IconComponent && (
                  <IconComponent size={24} className="shrink-0" style={{ color: moodColor }} />
                )}
                <div>
                  <span className="text-base font-semibold text-white">{rec.title}</span>
                  <p className="text-sm text-white/60">{rec.description}</p>
                </div>
              </Link>
            )
          })}
        </div>

        <button
          onClick={handleSkipClick}
          className="mt-6 inline-flex min-h-[44px] items-center text-sm text-white/40 underline underline-offset-4 hover:text-white/60 focus-visible:text-white/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 lg:mt-8"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  )
}
