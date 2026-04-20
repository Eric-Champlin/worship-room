import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Moon, Music, Wind } from 'lucide-react'
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
import { SEO, SITE_URL } from '@/components/SEO'
import { MUSIC_METADATA } from '@/lib/seo/routeMetadata'
import { cn } from '@/lib/utils'
const musicBreadcrumbs = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Music' },
  ],
}
import type { SharedMixData } from '@/types/storage'

const TABS = [
  { id: 'playlists', label: 'Worship Playlists', icon: Music },
  { id: 'ambient', label: 'Ambient Sounds', icon: Wind },
  { id: 'sleep', label: 'Sleep & Rest', icon: Moon },
] as const

type MusicTabId = (typeof TABS)[number]['id']

function isValidTab(value: string | null): value is MusicTabId {
  return value === 'playlists' || value === 'ambient' || value === 'sleep'
}

// Loading state: use MusicSkeleton
export function MusicPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const defaultTab: MusicTabId = 'playlists'
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
    <div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">
      <SEO {...MUSIC_METADATA} jsonLd={musicBreadcrumbs} />
      <Navbar transparent />

      <main id="main-content">
        {/* Hero */}
        <PageHero
          title="Music"
          subtitle="Worship, rest, and find peace in God's presence."
        />

        {/* Sentinel for sticky tab bar shadow */}
        <div ref={sentinelRef} aria-hidden="true" />

        {/* Sticky Tab Bar — pill+halo pattern matching Daily Hub */}
        <div
          className={cn(
            'relative sticky top-0 z-40 backdrop-blur-md transition-shadow motion-reduce:transition-none',
            isSticky && 'shadow-md shadow-black/20',
          )}
        >
          <div className="mx-auto flex max-w-xl items-center justify-center px-4 py-3 sm:py-4">
            <div
              ref={tabBarRef}
              className="flex w-full rounded-full border border-white/[0.12] bg-white/[0.06] p-1"
              role="tablist"
              aria-label="Music sections"
              {...(tabBarTooltip.shouldShow ? { 'aria-describedby': 'music-ambient-tab' } : {})}
            >
              {TABS.map((tab, index) => {
                const isActive = activeTab === tab.id
                const Icon = tab.icon
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
                      'flex flex-1 items-center justify-center gap-2 rounded-full min-h-[44px] text-sm font-medium transition-all motion-reduce:transition-none duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0a1e] sm:text-base active:scale-[0.98]',
                      isActive
                        ? 'bg-white/[0.12] border border-white/[0.15] text-white shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent',
                    )}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    <span className="hidden min-[400px]:inline">{tab.label}</span>
                    <span className="sr-only min-[400px]:hidden">{tab.label}</span>
                  </button>
                )
              })}
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
