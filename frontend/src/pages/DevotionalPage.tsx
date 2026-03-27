import { useSearchParams, useNavigate } from 'react-router-dom'
import { useCallback, useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, BookOpen, Share2, Volume2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Navbar } from '@/components/Navbar'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { SiteFooter } from '@/components/SiteFooter'
import { getTodaysDevotional, formatDevotionalDate } from '@/data/devotionals'
import { useSwipe } from '@/hooks/useSwipe'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useToast } from '@/components/ui/Toast'
import { useReadAloud } from '@/hooks/useReadAloud'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { SEO, SITE_URL } from '@/components/SEO'
import { RelatedPlanCallout } from '@/components/devotional/RelatedPlanCallout'
import { useReadingPlanProgress } from '@/hooks/useReadingPlanProgress'
import { READING_PLANS } from '@/data/reading-plans'
import type { Devotional } from '@/types/devotional'

function buildReadAloudText(devotional: Devotional): string {
  const quoteText = devotional.quote.text
  const passageText = devotional.passage.verses.map((v) => v.text).join(' ')
  const reflectionText = devotional.reflection.join(' ')
  const prayerText = devotional.prayer
  const questionText = devotional.reflectionQuestion
  return `${quoteText} ${passageText} ${reflectionText} ${prayerText} ${questionText}`
}

export function DevotionalPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const dayOffset = Math.max(-7, Math.min(0, Number(searchParams.get('day')) || 0))
  const devotional = getTodaysDevotional(new Date(), dayOffset)
  const dateStr = formatDevotionalDate(new Date(), dayOffset)
  const questionRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const { showToast } = useToast()
  const readAloud = useReadAloud()
  const { playSoundEffect } = useSoundEffects()
  const { getPlanStatus } = useReadingPlanProgress()
  const [isCompleted, setIsCompleted] = useState(false)

  // Find matching reading plan by theme (strict equality)
  const matchingPlan = READING_PLANS.find(
    (p) => (p.theme as string) === (devotional.theme as string),
  )
  const matchingPlanStatus = matchingPlan ? getPlanStatus(matchingPlan.id) : 'completed'
  const showPlanCallout =
    matchingPlan && matchingPlanStatus !== 'completed'

  // Check existing completion state on mount / auth change
  useEffect(() => {
    if (!isAuthenticated) return
    let reads: string[] = []
    try {
      reads = JSON.parse(localStorage.getItem('wr_devotional_reads') || '[]') as string[]
    } catch {
      // Malformed localStorage — treat as empty
    }
    const todayStr = new Date().toLocaleDateString('en-CA')
    setIsCompleted(reads.includes(todayStr))
  }, [isAuthenticated])

  // Intersection Observer — only for today's devotional when logged in
  useEffect(() => {
    if (!isAuthenticated || dayOffset !== 0 || isCompleted) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const todayStr = new Date().toLocaleDateString('en-CA')
          let reads: string[] = []
          try {
            reads = JSON.parse(localStorage.getItem('wr_devotional_reads') || '[]') as string[]
          } catch {
            // Malformed localStorage — treat as empty
          }
          if (!reads.includes(todayStr)) {
            reads.push(todayStr)
            while (reads.length > 365) reads.shift()
            localStorage.setItem('wr_devotional_reads', JSON.stringify(reads))
          }
          setIsCompleted(true)
          playSoundEffect('chime')
          observer.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    if (questionRef.current) observer.observe(questionRef.current)
    return () => observer.disconnect()
  }, [isAuthenticated, dayOffset, isCompleted])

  const navigateDay = useCallback(
    (direction: -1 | 1) => {
      const newOffset = dayOffset + direction
      if (newOffset >= -7 && newOffset <= 0) {
        if (newOffset === 0) {
          setSearchParams({}, { replace: true })
        } else {
          setSearchParams({ day: String(newOffset) }, { replace: true })
        }
      }
    },
    [dayOffset, setSearchParams],
  )

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => navigateDay(1),
    onSwipeRight: () => navigateDay(-1),
  })

  const handleJournalClick = useCallback(() => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to journal about this devotional')
      return
    }
    navigate(`/daily?tab=journal&context=devotional&theme=${devotional.theme}`)
  }, [isAuthenticated, authModal, navigate, devotional.theme])

  const handleShareClick = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      showToast('Link copied!', 'success')
    } catch {
      showToast('Could not copy link', 'error')
    }
  }, [showToast])

  const handleReadAloudClick = useCallback(() => {
    if (readAloud.state === 'idle') readAloud.play(buildReadAloudText(devotional))
    else if (readAloud.state === 'playing') readAloud.pause()
    else readAloud.resume()
  }, [readAloud, devotional])

  return (
    <div className="min-h-screen bg-[#0f0a1e]" {...swipeHandlers}>
      <a
        href="#devotional-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar transparent />
      <SEO
        title="Daily Devotional"
        description="Start each morning with an inspiring quote, Bible passage, reflection, and prayer."
        ogType="article"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
              { '@type': 'ListItem', position: 2, name: 'Daily Devotional' },
            ],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: devotional.title,
            datePublished: new Date().toLocaleDateString('en-CA'),
            description: devotional.reflection[0]?.slice(0, 155) || '',
            author: { '@type': 'Organization', name: 'Worship Room' },
            publisher: {
              '@type': 'Organization',
              name: 'Worship Room',
              logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png` },
            },
          },
        ]}
      />
        {/* Hero section */}
        <section
          className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
          style={ATMOSPHERIC_HERO_BG}
        >
          <h1 className="font-script text-3xl font-bold bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl">
            Daily Devotional
          </h1>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => navigateDay(-1)}
              disabled={dayOffset <= -7}
              className={cn(
                'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 transition-colors',
                dayOffset <= -7
                  ? 'cursor-not-allowed text-white/15'
                  : 'text-white/40 hover:text-white/70',
              )}
              aria-label="Previous day's devotional"
              aria-disabled={dayOffset <= -7}
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-lg text-white/85 sm:text-xl">{dateStr}</span>
              {isCompleted && dayOffset === 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-sm text-white/50">
                  <Check size={14} />
                  Completed
                </span>
              )}
            </div>
            <button
              onClick={() => navigateDay(1)}
              disabled={dayOffset >= 0}
              className={cn(
                'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 transition-colors',
                dayOffset >= 0
                  ? 'cursor-not-allowed text-white/15'
                  : 'text-white/40 hover:text-white/70',
              )}
              aria-label="Next day's devotional"
              aria-disabled={dayOffset >= 0}
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </section>

        {/* Content sections */}
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          {/* Devotional title */}
          <h2 className="pt-8 text-center text-2xl font-bold text-white sm:pt-10 sm:text-3xl">
            {devotional.title}
          </h2>

          {/* Quote section */}
          <div className="border-t border-white/10 py-8 sm:py-10">
            <div className="relative">
              <span className="font-serif text-5xl leading-none text-white/20" aria-hidden="true">
                &ldquo;
              </span>
              <blockquote className="mt-2 font-serif text-xl italic leading-relaxed text-white/70 sm:text-2xl">
                {devotional.quote.text}
              </blockquote>
              <p className="mt-3 text-sm text-white/40">&mdash; {devotional.quote.attribution}</p>
            </div>
          </div>

          {/* Passage section */}
          <div className="border-t border-white/10 py-8 sm:py-10">
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-primary-lt">
              {devotional.passage.reference}
            </p>
            <p className="font-serif text-base italic leading-relaxed text-white/70 sm:text-lg">
              {devotional.passage.verses.map((verse) => (
                <span key={verse.number}>
                  <sup className="mr-1 align-super font-sans text-xs text-white/30">
                    {verse.number}
                  </sup>
                  {verse.text}{' '}
                </span>
              ))}
            </p>
          </div>

          {/* Reflection section */}
          <div className="border-t border-white/10 py-8 sm:py-10">
            <div className="space-y-4 text-base leading-relaxed text-white/80">
              {devotional.reflection.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>

          {/* Prayer section */}
          <div className="border-t border-white/10 py-8 sm:py-10">
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/40">
              Closing Prayer
            </p>
            <p className="font-serif text-base italic leading-relaxed text-white/60">
              {devotional.prayer}
            </p>
          </div>

          {/* Reflection question section */}
          <div className="border-t border-white/10 py-8 sm:py-10" ref={questionRef}>
            <div className="rounded-2xl border border-white/10 border-l-2 border-l-primary bg-white/[0.06] p-4 backdrop-blur-sm sm:p-6">
              <p className="text-sm text-white/40">Something to think about today:</p>
              <p className="mt-2 text-lg font-medium text-white">
                {devotional.reflectionQuestion.replace('Something to think about today: ', '')}
              </p>
            </div>
          </div>

          {/* Related reading plan callout */}
          {showPlanCallout && (
            <RelatedPlanCallout
              planId={matchingPlan.id}
              planTitle={matchingPlan.title}
              planDuration={matchingPlan.durationDays}
              planStatus={matchingPlanStatus as 'unstarted' | 'active' | 'paused'}
            />
          )}

          {/* Action buttons */}
          <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:justify-center">
            <button
              onClick={handleJournalClick}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15"
            >
              <BookOpen size={18} />
              Journal about this
            </button>
            <button
              onClick={handleShareClick}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15"
            >
              <Share2 size={18} />
              Share today&apos;s devotional
            </button>
            <button
              onClick={handleReadAloudClick}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15"
            >
              <Volume2 size={18} />
              {readAloud.state === 'idle'
                ? 'Read aloud'
                : readAloud.state === 'playing'
                  ? 'Pause'
                  : 'Resume'}
            </button>
          </div>

          {/* Bottom padding */}
          <div className="pb-16 sm:pb-20" />
        </div>
      <SiteFooter />
    </div>
  )
}
