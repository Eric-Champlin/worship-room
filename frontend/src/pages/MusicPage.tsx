import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { PageHero } from '@/components/PageHero'
import { SiteFooter } from '@/components/SiteFooter'
import { AmbientBrowser } from '@/components/audio/AmbientBrowser'
import { useAudioDispatch, useAudioEngine } from '@/components/audio/AudioProvider'
import { SleepBrowse } from '@/components/audio/SleepBrowse'
import { SharedMixHero } from '@/components/music/SharedMixHero'
import { WorshipPlaylistsTab } from '@/components/music/WorshipPlaylistsTab'
import { useScenePlayer } from '@/hooks/useScenePlayer'
import { RoutineInterruptDialog } from '@/components/audio/RoutineInterruptDialog'
import { storageService } from '@/services/storage-service'
// import { SCENE_BY_ID } from '@/data/scenes'
import { SOUND_BY_ID } from '@/data/sound-catalog'
import { AUDIO_BASE_URL } from '@/constants/audio'
import { useTooltipCallout } from '@/hooks/useTooltipCallout'
import { TooltipCallout } from '@/components/ui/TooltipCallout'
import { TOOLTIP_DEFINITIONS } from '@/constants/tooltips'
import { useAuth } from '@/hooks/useAuth'
import { setGettingStartedFlag, isGettingStartedComplete } from '@/services/getting-started-storage'
import { cn } from '@/lib/utils'
import type { SharedMixData } from '@/types/storage'

// Removed in visual polish — keeping for potential re-enable
// import { LofiCrossReference } from '@/components/music/LofiCrossReference'
// import { MusicHint } from '@/components/music/MusicHint'
// import { PersonalizationSection } from '@/components/music/PersonalizationSection'
// import { ResumePrompt } from '@/components/music/ResumePrompt'
// import { RecentlyAddedSection } from '@/components/music/RecentlyAddedSection'
// import { TimeOfDaySection } from '@/components/music/TimeOfDaySection'
// import { useMusicHints } from '@/hooks/useMusicHints'
// import { useTimeOfDayRecommendations } from '@/hooks/useTimeOfDayRecommendations'

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
  const defaultTab: MusicTabId = 'ambient'
  const activeTab: MusicTabId = isValidTab(rawTab) ? rawTab : defaultTab

  // Getting Started checklist: flag ambient visit
  const { isAuthenticated } = useAuth()
  useEffect(() => {
    if (isAuthenticated && activeTab === 'ambient' && !isGettingStartedComplete()) {
      setGettingStartedFlag('ambient_visited', true)
    }
  }, [isAuthenticated, activeTab])

  // Shared mix URL parsing
  const dispatch = useAudioDispatch()
  const engine = useAudioEngine()
  const [sharedMixData, setSharedMixData] = useState<SharedMixData | null>(null)

  const rawMix = searchParams.get('mix')
  const decodedMix = useMemo(() => {
    if (!rawMix) return null
    const data = storageService.decodeSharedMix(rawMix)
    if (!data) return null
    // Validate all sound IDs exist
    const allValid = data.sounds.every((s) => SOUND_BY_ID.has(s.id))
    return allValid ? data : null
  }, [rawMix])

  useEffect(() => {
    if (decodedMix) {
      setSharedMixData(decodedMix)
      // Force ambient tab when shared mix present
      if (rawTab !== 'ambient') {
        setSearchParams({ tab: 'ambient', mix: rawMix! }, { replace: true })
      }
    }
  }, [decodedMix, rawTab, rawMix, setSearchParams])

  function handlePlaySharedMix() {
    if (!sharedMixData) return

    // Stagger-add shared mix sounds
    sharedMixData.sounds.forEach((s, index) => {
      const catalogSound = SOUND_BY_ID.get(s.id)
      if (!catalogSound) return

      setTimeout(() => {
        const url = AUDIO_BASE_URL + catalogSound.filename
        engine?.addSound(s.id, url, s.v)
        dispatch({
          type: 'ADD_SOUND',
          payload: {
            soundId: s.id,
            volume: s.v,
            label: catalogSound.name,
            url,
          },
        })
      }, index * 200)
    })

    // Hide hero and clean URL
    setSharedMixData(null)
    setSearchParams({ tab: 'ambient' }, { replace: true })
  }

  function handleDismissSharedMix() {
    setSharedMixData(null)
    setSearchParams({ tab: 'ambient' }, { replace: true })
  }

  // Tooltip for tab bar
  const tabBarRef = useRef<HTMLDivElement>(null)
  const tabBarTooltip = useTooltipCallout('music-ambient-tab', tabBarRef)

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

  const switchTab = useCallback(
    (tab: MusicTabId) => {
      setSearchParams({ tab }, { replace: true })
    },
    [setSearchParams],
  )

  // Scene player for routine interrupt dialog
  const scenePlayer = useScenePlayer()

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
              ref={tabBarRef}
              className="relative flex w-full"
              role="tablist"
              aria-label="Music sections"
              {...(tabBarTooltip.shouldShow ? { 'aria-describedby': 'music-ambient-tab' } : {})}
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
          {sharedMixData && (
            <SharedMixHero
              mixData={sharedMixData}
              onPlay={handlePlaySharedMix}
              onDismiss={handleDismissSharedMix}
            />
          )}
          <div className="px-4 py-8 sm:px-6">
            <div className="relative mx-auto max-w-6xl">
              <AmbientBrowser />
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

      {scenePlayer.pendingRoutineInterrupt && (
        <RoutineInterruptDialog
          onConfirm={scenePlayer.confirmRoutineInterrupt}
          onCancel={scenePlayer.cancelRoutineInterrupt}
        />
      )}

      {tabBarTooltip.shouldShow && (
        <TooltipCallout
          targetRef={tabBarRef}
          message={TOOLTIP_DEFINITIONS['music-ambient-tab'].message}
          tooltipId="music-ambient-tab"
          position={TOOLTIP_DEFINITIONS['music-ambient-tab'].position}
          onDismiss={tabBarTooltip.dismiss}
        />
      )}
    </div>
  )
}
