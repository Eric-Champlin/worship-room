import { Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useFavorites } from '@/hooks/useFavorites'
import { useSavedMixes } from '@/hooks/useSavedMixes'
import { useListeningHistory } from '@/hooks/useListeningHistory'
import { useRoutinePlayer } from '@/hooks/useRoutinePlayer'
import { storageService } from '@/services/storage-service'
import { ROUTINE_TEMPLATES } from '@/data/music/routines'
import { useAudioDispatch, useAudioEngine } from '@/components/audio/AudioProvider'
import { SCENE_BY_ID } from '@/data/scenes'
import { SCRIPTURE_READING_BY_ID } from '@/data/music/scripture-readings'
import { BEDTIME_STORY_BY_ID } from '@/data/music/bedtime-stories'
import { SOUND_BY_ID } from '@/data/sound-catalog'
import { AUDIO_BASE_URL } from '@/constants/audio'
import type { FavoriteType } from '@/types/storage'

const TYPE_LABELS: Record<FavoriteType, string> = {
  scene: 'Scene',
  sleep_session: 'Sleep',
  custom_mix: 'Mix',
}

const STAGGER_MS = 200

function getSceneName(id: string): string | null {
  return SCENE_BY_ID.get(id)?.name ?? null
}

function getSceneArtwork(id: string): string | null {
  const scene = SCENE_BY_ID.get(id)
  return scene?.artworkFilename ? `/audio/artwork/${scene.artworkFilename}` : null
}

function getSleepTitle(id: string): string | null {
  const reading = SCRIPTURE_READING_BY_ID.get(id)
  if (reading) return reading.title
  const story = BEDTIME_STORY_BY_ID.get(id)
  if (story) return story.title
  return null
}

function getMixSoundNames(sounds: { soundId: string }[]): string {
  return sounds
    .map((s) => SOUND_BY_ID.get(s.soundId)?.name)
    .filter(Boolean)
    .slice(0, 3)
    .join(', ')
}

function getContentTitle(contentType: string, contentId: string): string {
  if (contentType === 'scene') return getSceneName(contentId) ?? contentId
  if (contentType === 'scripture' || contentType === 'story') return getSleepTitle(contentId) ?? contentId
  return contentId
}

function getContentTypeLabel(contentType: string): string {
  if (contentType === 'scene') return 'Ambient Scene'
  if (contentType === 'scripture') return 'Scripture Reading'
  if (contentType === 'story') return 'Bedtime Story'
  return 'Session'
}

export function PersonalizationSection() {
  const { isLoggedIn } = useAuth()
  const { favorites } = useFavorites()
  const { mixes } = useSavedMixes()
  const { getLastSession } = useListeningHistory()
  const dispatch = useAudioDispatch()
  const engine = useAudioEngine()

  const { startRoutine } = useRoutinePlayer()

  if (!isLoggedIn) return null

  const lastSession = getLastSession()
  const hasFavorites = favorites.length > 0
  const hasSavedMixes = mixes.length > 0
  const userRoutines = storageService.getRoutines()
  const allRoutines = [...ROUTINE_TEMPLATES, ...userRoutines]
  const hasRoutines = allRoutines.length > 0

  if (!lastSession && !hasFavorites && !hasSavedMixes && !hasRoutines) return null

  function handleResumeLastSession() {
    if (!lastSession) return

    if (lastSession.contentType === 'scene') {
      const scene = SCENE_BY_ID.get(lastSession.contentId)
      if (scene) {
        dispatch({ type: 'SET_SCENE_NAME', payload: { sceneName: scene.name, sceneId: scene.id } })
        scene.sounds.forEach((s, index) => {
          const catalogSound = SOUND_BY_ID.get(s.soundId)
          if (!catalogSound) return
          setTimeout(() => {
            const url = AUDIO_BASE_URL + catalogSound.filename
            engine?.addSound(s.soundId, url, s.volume)
            dispatch({
              type: 'ADD_SOUND',
              payload: { soundId: s.soundId, volume: s.volume, label: catalogSound.name, url },
            })
          }, index * STAGGER_MS)
        })
      }
    }
  }

  const lastSessionTitle = lastSession
    ? getContentTitle(lastSession.contentType, lastSession.contentId)
    : ''

  return (
    <section
      aria-label="Personalized recommendations"
      className="mx-auto max-w-6xl px-4 py-6 sm:px-6"
    >
      {lastSession && (
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold text-text-dark">
            Continue Listening
          </h2>
          <button
            type="button"
            aria-label={`Resume ${lastSessionTitle}`}
            onClick={handleResumeLastSession}
            className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
          >
            {(() => {
              const artwork = lastSession.contentType === 'scene'
                ? getSceneArtwork(lastSession.contentId)
                : null
              return (
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg">
                  {artwork ? (
                    <img
                      src={artwork}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-white">
                      <Play size={14} fill="currentColor" />
                    </div>
                  )}
                </div>
              )
            })()}
            <div>
              <p className="text-sm font-medium text-text-dark">
                {lastSessionTitle}
              </p>
              <p className="text-xs text-text-light">
                {getContentTypeLabel(lastSession.contentType)}
              </p>
            </div>
          </button>
        </div>
      )}

      {hasFavorites && (
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold text-text-dark">
            Your Favorites
          </h2>
          <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
            {favorites.map((fav) => {
              const title =
                fav.type === 'scene'
                  ? getSceneName(fav.targetId)
                  : getSleepTitle(fav.targetId)
              if (!title) return null
              const artwork =
                fav.type === 'scene' ? getSceneArtwork(fav.targetId) : null
              return (
                <div
                  key={`${fav.type}-${fav.targetId}`}
                  className="flex min-w-[140px] flex-shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                >
                  {artwork && (
                    <div className="aspect-[3/2] overflow-hidden">
                      <img
                        src={artwork}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-sm font-medium text-text-dark">
                      {title}
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {TYPE_LABELS[fav.type]}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {hasSavedMixes && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-text-dark">
            Your Saved Mixes
          </h2>
          <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
            {mixes.slice(0, 5).map((mix) => (
              <div
                key={mix.id}
                className="flex min-w-[140px] flex-shrink-0 flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
              >
                <p className="text-sm font-medium text-text-dark">
                  {mix.name}
                </p>
                <p className="mt-0.5 text-xs text-text-light">
                  {getMixSoundNames(mix.sounds)}
                </p>
                <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Mix
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasRoutines && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-dark">
              Your Routines
            </h2>
            <Link
              to="/music/routines"
              className="text-xs font-medium text-primary hover:underline"
            >
              Manage Routines
            </Link>
          </div>
          <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
            {allRoutines.slice(0, 5).map((routine) => (
              <div
                key={routine.id}
                className="flex min-w-[160px] flex-shrink-0 flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
              >
                <p className="text-sm font-medium text-text-dark">
                  {routine.name}
                </p>
                <p className="mt-0.5 text-xs text-text-light">
                  {routine.steps.length} step{routine.steps.length !== 1 ? 's' : ''}
                </p>
                <button
                  type="button"
                  onClick={() => startRoutine(routine)}
                  aria-label={`Start ${routine.name}`}
                  className="mt-2 flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  <Play size={10} fill="currentColor" />
                  Start
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
