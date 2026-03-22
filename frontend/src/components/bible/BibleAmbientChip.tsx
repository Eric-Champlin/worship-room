import { useState, useRef, useEffect, useCallback } from 'react'
import { Music } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAudioState, useAudioDispatch } from '@/components/audio/AudioProvider'
import { useScenePlayer } from '@/hooks/useScenePlayer'
import { getSuggestedScenes } from '@/constants/ambient-suggestions'
import type { ScenePreset } from '@/types/music'

export function BibleAmbientChip() {
  const [expanded, setExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const pillButtonRef = useRef<HTMLButtonElement>(null)
  const firstCardRef = useRef<HTMLButtonElement>(null)

  const audioState = useAudioState()
  const dispatch = useAudioDispatch()
  const { loadScene } = useScenePlayer()

  const hasActiveAudio = audioState.activeSounds.length > 0 || audioState.pillVisible
  const scenes = getSuggestedScenes('bible-reading')

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const collapse = useCallback(() => {
    setExpanded(false)
    pillButtonRef.current?.focus()
  }, [])

  // Click outside dismissal
  useEffect(() => {
    if (!expanded) return

    const handleMouseDown = (e: MouseEvent) => {
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

  const handlePillClick = () => {
    if (hasActiveAudio) {
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

  const panelId = 'bible-ambient-panel'

  const playingLabel = audioState.currentSceneName
    ? `Playing: ${audioState.currentSceneName}`
    : 'Playing: Custom mix'

  const pillAriaLabel = hasActiveAudio
    ? `${playingLabel}, click to open audio controls`
    : 'Add background sounds'

  return (
    <div ref={containerRef}>
      {/* Chip button */}
      <button
        ref={pillButtonRef}
        type="button"
        onClick={handlePillClick}
        aria-expanded={expanded}
        aria-controls={!hasActiveAudio ? panelId : undefined}
        aria-label={pillAriaLabel}
        className={
          hasActiveAudio
            ? 'inline-flex w-full items-center gap-2 rounded-full border border-white/10 border-l-2 border-l-primary bg-white/5 py-2 px-4 text-sm backdrop-blur-sm transition-colors hover:bg-white/10 sm:w-auto'
            : 'inline-flex w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 py-2 px-4 text-sm backdrop-blur-sm transition-colors hover:bg-white/10 sm:w-auto'
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
            <span className="font-medium text-white/70">
              {playingLabel}
            </span>
          </>
        ) : (
          <>
            <Music className="h-4 w-4 text-white/50" aria-hidden="true" />
            <span className="text-white/50">Add background sounds</span>
          </>
        )}
      </button>

      {/* Suggestion panel */}
      {expanded && !hasActiveAudio && (
        <div
          id={panelId}
          role="region"
          aria-label="Ambient sound suggestions"
          className={`mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm sm:w-auto sm:max-w-[480px] ${
            reducedMotion ? '' : 'animate-fade-in'
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
                className="min-w-[140px] min-h-[44px] flex-shrink-0 snap-center cursor-pointer rounded-lg bg-white/5 p-3 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:min-w-0 sm:flex-1"
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
              className="text-xs text-white/40 transition-colors hover:text-white/60"
            >
              Browse all sounds &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
