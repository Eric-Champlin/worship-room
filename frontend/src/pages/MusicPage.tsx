import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { PageHero } from '@/components/PageHero'
import { SiteFooter } from '@/components/SiteFooter'
import { AmbientBrowser } from '@/components/audio/AmbientBrowser'
import { useAudioState } from '@/components/audio/AudioProvider'
import { SleepBrowse } from '@/components/audio/SleepBrowse'
import { LofiCrossReference } from '@/components/music/LofiCrossReference'
import { MusicHint } from '@/components/music/MusicHint'
import { PersonalizationSection } from '@/components/music/PersonalizationSection'
import { RecentlyAddedSection } from '@/components/music/RecentlyAddedSection'
import { WorshipPlaylistsTab } from '@/components/music/WorshipPlaylistsTab'
import { useMusicHints } from '@/hooks/useMusicHints'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'playlists', label: 'Worship Playlists', shortLabel: 'Playlists' },
  { id: 'ambient', label: 'Ambient Sounds', shortLabel: 'Ambient' },
  { id: 'sleep', label: 'Sleep & Rest', shortLabel: 'Sleep' },
] as const

type MusicTabId = (typeof TABS)[number]['id']

function isValidTab(value: string | null): value is MusicTabId {
  return value === 'playlists' || value === 'ambient' || value === 'sleep'
}

export function MusicPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const activeTab: MusicTabId = isValidTab(rawTab) ? rawTab : 'ambient'

  // Sticky tab bar shadow on scroll
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [isSticky, setIsSticky] = useState(false)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  // First-time hints
  const audioState = useAudioState()
  const { showSoundGridHint, showPillHint, dismissSoundGridHint, dismissPillHint } =
    useMusicHints()
  const prevSoundCountRef = useRef(audioState.activeSounds.length)

  // Dismiss sound grid hint when first sound is added
  useEffect(() => {
    if (prevSoundCountRef.current === 0 && audioState.activeSounds.length > 0) {
      dismissSoundGridHint()
    }
    prevSoundCountRef.current = audioState.activeSounds.length
  }, [audioState.activeSounds.length, dismissSoundGridHint])

  // Dismiss pill hint when drawer opens
  useEffect(() => {
    if (audioState.drawerOpen) {
      dismissPillHint()
    }
  }, [audioState.drawerOpen, dismissPillHint])

  const switchTab = useCallback(
    (tab: MusicTabId) => {
      setSearchParams({ tab }, { replace: true })
    },
    [setSearchParams],
  )

  // Tab underline position
  const activeTabIndex = TABS.findIndex((t) => t.id === activeTab)

  // Arrow key navigation for tab bar (WAI-ARIA Tabs pattern)
  const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([])
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      let nextIndex: number | null = null
      if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % TABS.length
      else if (e.key === 'ArrowLeft')
        nextIndex = (currentIndex - 1 + TABS.length) % TABS.length
      else if (e.key === 'Home') nextIndex = 0
      else if (e.key === 'End') nextIndex = TABS.length - 1
      if (nextIndex !== null) {
        e.preventDefault()
        switchTab(TABS[nextIndex].id)
        tabButtonRefs.current[nextIndex]?.focus()
      }
    },
    [switchTab],
  )

  return (
    <div className="flex min-h-screen flex-col bg-neutral-bg font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-primary focus:shadow-lg"
      >
        Skip to content
      </a>
      <Navbar transparent />

      <main id="main-content">
        {/* Hero */}
        <PageHero
          title="Music"
          subtitle="Worship, rest, and find peace in God's presence."
        />

        {/* Personalization (logged-in with data only) */}
        <PersonalizationSection />

        {/* Recently Added (hidden at launch) */}
        <RecentlyAddedSection />

        {/* Sentinel for sticky tab bar shadow */}
        <div ref={sentinelRef} aria-hidden="true" />

        {/* Sticky Tab Bar */}
        <div
          className={cn(
            'sticky top-0 z-40 bg-neutral-bg transition-shadow',
            isSticky && 'shadow-md',
          )}
        >
          <div className="mx-auto flex max-w-3xl items-center justify-center border-b border-gray-200">
            <div
              className="relative flex w-full"
              role="tablist"
              aria-label="Music sections"
            >
              {TABS.map((tab, index) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      tabButtonRefs.current[index] = el
                    }}
                    type="button"
                    role="tab"
                    id={`tab-${tab.id}`}
                    aria-selected={isActive}
                    aria-controls={`tabpanel-${tab.id}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => switchTab(tab.id)}
                    onKeyDown={(e) => handleTabKeyDown(e, index)}
                    className={cn(
                      'flex flex-1 items-center justify-center px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:py-4 sm:text-base',
                      isActive
                        ? 'text-primary'
                        : 'text-text-light hover:text-text-dark',
                    )}
                  >
                    <span className="sm:hidden">{tab.shortLabel}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                )
              })}
              {/* Animated underline */}
              <div
                className="absolute bottom-0 h-0.5 bg-primary transition-transform duration-200 ease-in-out"
                style={{
                  width: `${100 / TABS.length}%`,
                  transform: `translateX(${activeTabIndex * 100}%)`,
                }}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        {/* Tab Panels — all mounted, CSS show/hide for state preservation */}
        <div
          role="tabpanel"
          id="tabpanel-playlists"
          aria-labelledby="tab-playlists"
          hidden={activeTab !== 'playlists'}
        >
          <WorshipPlaylistsTab />
        </div>

        <div
          role="tabpanel"
          id="tabpanel-ambient"
          aria-labelledby="tab-ambient"
          hidden={activeTab !== 'ambient'}
        >
          <div className="bg-hero-dark px-4 py-8 sm:px-6">
            <div className="relative mx-auto max-w-6xl">
              {/* Sound grid hint */}
              <MusicHint
                text="Tap any sound to add it to your mix"
                visible={showSoundGridHint && activeTab === 'ambient'}
                position="above"
                onDismiss={dismissSoundGridHint}
              />
              <AmbientBrowser />
            </div>
            <div className="mx-auto mt-8 max-w-6xl pb-8">
              <LofiCrossReference
                onNavigate={() => {
                  switchTab('playlists')
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      document
                        .getElementById('lofi-embed')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    })
                  })
                }}
              />
            </div>
          </div>
        </div>

        <div
          role="tabpanel"
          id="tabpanel-sleep"
          aria-labelledby="tab-sleep"
          hidden={activeTab !== 'sleep'}
        >
          <SleepBrowse />
        </div>
      </main>

      <SiteFooter />

      {/* Pill hint — fixed near the bottom where the pill appears */}
      {showPillHint && audioState.pillVisible && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2">
          <MusicHint
            text="Your mix lives here — tap to expand"
            visible
            position="above"
            onDismiss={dismissPillHint}
          />
        </div>
      )}
    </div>
  )
}
