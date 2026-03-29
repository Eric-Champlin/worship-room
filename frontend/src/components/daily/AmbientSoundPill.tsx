import { useState, useRef, useEffect, useCallback } from 'react'
import { Music } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAudioState, useAudioDispatch } from '@/components/audio/AudioProvider'
import { useScenePlayer } from '@/hooks/useScenePlayer'
import { getSuggestedScenes } from '@/constants/ambient-suggestions'
import type { AmbientContext } from '@/constants/ambient-suggestions'
import type { ScenePreset } from '@/types/music'

interface AmbientSoundPillProps {
  context: AmbientContext
  variant?: 'light' | 'dark'
  visible?: boolean
}

export function AmbientSoundPill({
  context,
  variant = 'light',
  visible = true,
}: AmbientSoundPillProps) {
  const [expanded, setExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const pillButtonRef = useRef<HTMLButtonElement>(null)
  const firstCardRef = useRef<HTMLButtonElement>(null)

  const audioState = useAudioState()
  const dispatch = useAudioDispatch()
  const { loadScene } = useScenePlayer()

  const hasActiveAudio = audioState.activeSounds.length > 0 || audioState.pillVisible
  const scenes = getSuggestedScenes(context)

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const collapse = useCallback(() => {
    setExpanded(false)
    pillButtonRef.current?.focus()
  }, [])

  // Click-outside dismissal
  useEffect(() => {
    if (!expanded) return

    const handleMouseDown = (e: MouseEvent) => {
      // Don't fire from hidden tabs (offsetParent is null when hidden)
      if (containerRef.current?.offsetParent === null) return
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        collapse()
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [expanded, collapse])

  // Escape key
  useEffect(() => {
    if (!expanded) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        collapse()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [expanded, collapse])

  // Focus first card on expand
  useEffect(() => {
    if (expanded) {
      const timer = setTimeout(() => {
        firstCardRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [expanded])

  if (!visible) return null

  const handlePillClick = () => {
    if (hasActiveAudio) {
      // Toggle AudioDrawer
      dispatch({ type: audioState.drawerOpen ? 'CLOSE_DRAWER' : 'OPEN_DRAWER' })
    } else {
      setExpanded(!expanded)
    }
  }

  const handleSceneCardClick = (scene: ScenePreset) => {
    loadScene(scene)
    setTimeout(() => {
      setExpanded(false)
    }, 300)
  }

  const panelId = `ambient-panel-${context}`

  const playingLabel = audioState.currentSceneName
    ? `Playing: ${audioState.currentSceneName}`
    : 'Playing: Custom mix'

  const pillAriaLabel = hasActiveAudio
    ? `${playingLabel}, click to open audio controls`
    : 'Enhance with sound'

  const isLight = variant === 'light'

  return (
    <div ref={containerRef} className="mb-4">
      {/* Pill button */}
      <button
        ref={pillButtonRef}
        type="button"
        onClick={handlePillClick}
        aria-expanded={expanded}
        aria-controls={!hasActiveAudio ? panelId : undefined}
        aria-label={pillAriaLabel}
        className={
          hasActiveAudio
            ? `inline-flex w-full min-h-[44px] items-center gap-2 rounded-full border py-2 px-4 text-sm transition-colors sm:w-auto ${
                isLight
                  ? 'border-gray-200/50 border-l-2 border-l-primary bg-gray-100/80 backdrop-blur-md hover:bg-gray-200/80'
                  : 'border-white/20 border-l-2 border-l-primary bg-white/10 backdrop-blur-md hover:bg-white/20'
              }`
            : `inline-flex w-full min-h-[44px] items-center gap-2 rounded-full border py-2 px-4 text-sm transition-colors sm:w-auto ${
                isLight
                  ? 'border-gray-200/50 bg-gray-100/80 backdrop-blur-md hover:bg-gray-200/80'
                  : 'border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20'
              }`
        }
      >
        {hasActiveAudio ? (
          <>
            {/* Waveform bars */}
            <span className="flex items-end gap-[2px]" aria-hidden="true">
              <span
                className={`w-[3px] rounded-full bg-primary ${
                  reducedMotion ? 'h-[10px]' : 'h-[4px] animate-waveform-bar-1'
                }`}
              />
              <span
                className={`w-[3px] rounded-full bg-primary ${
                  reducedMotion ? 'h-[14px]' : 'h-[8px] animate-waveform-bar-2'
                }`}
              />
              <span
                className={`w-[3px] rounded-full bg-primary ${
                  reducedMotion ? 'h-[8px]' : 'h-[6px] animate-waveform-bar-3'
                }`}
              />
            </span>
            <span
              className={`font-medium ${isLight ? 'text-gray-600' : 'text-white/80'}`}
            >
              {playingLabel}
            </span>
          </>
        ) : (
          <>
            <Music
              className={`h-4 w-4 ${isLight ? 'text-gray-500' : 'text-white/60'}`}
              aria-hidden="true"
            />
            <span className={isLight ? 'text-gray-600' : 'text-white/70'}>
              Enhance with sound
            </span>
          </>
        )}
      </button>

      {/* Expanded suggestion panel */}
      {expanded && !hasActiveAudio && (
        <div
          id={panelId}
          role="region"
          aria-label="Ambient sound suggestions"
          className={`mt-2 w-full rounded-xl border p-3 sm:max-w-[480px] sm:w-auto ${
            reducedMotion
              ? ''
              : 'animate-fade-in'
          } ${
            isLight
              ? 'border-gray-200 bg-white/90 shadow-lg backdrop-blur-md'
              : 'border-white/20 bg-black/70 shadow-lg backdrop-blur-md'
          }`}
        >
          {/* Scene cards */}
          <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory sm:overflow-visible">
            {scenes.map((scene, index) => (
              <button
                key={scene.id}
                ref={index === 0 ? firstCardRef : undefined}
                type="button"
                onClick={() => handleSceneCardClick(scene)}
                className={`min-w-[140px] flex-shrink-0 snap-center rounded-lg p-3 min-h-[44px] cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none sm:min-w-0 sm:flex-1 ${
                  isLight
                    ? 'bg-gray-50 hover:bg-gray-100 text-gray-800'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                aria-label={scene.name}
              >
                <span className="text-sm font-medium">{scene.name}</span>
              </button>
            ))}
          </div>

          {/* Browse all link */}
          <div className="mt-2 text-center">
            <Link
              to="/music?tab=ambient"
              className={`text-xs transition-colors ${
                isLight
                  ? 'text-gray-400 hover:text-gray-600'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              Browse all sounds &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
