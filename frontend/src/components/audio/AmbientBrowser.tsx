import { useMemo } from 'react'
import { useAmbientSearch } from '@/hooks/useAmbientSearch'
import { useScenePlayer } from '@/hooks/useScenePlayer'
import { useSoundToggle } from '@/hooks/useSoundToggle'
import { useAuth } from '@/hooks/useAuth'
import { useSavedMixes } from '@/hooks/useSavedMixes'
import { useAudioState } from './AudioProvider'
import { FEATURED_SCENE_IDS, SCENE_BY_ID } from '@/data/scenes'
import { FeaturedSceneCard } from './FeaturedSceneCard'
import { SceneCard } from './SceneCard'
import { SoundGrid } from './SoundGrid'
import { SoundCard } from './SoundCard'
import { SceneUndoToast } from './SceneUndoToast'
import { SavedMixCard } from '@/components/music/SavedMixCard'
import { RoutineInterruptDialog } from './RoutineInterruptDialog'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SOUND_CATEGORY_COLORS } from '@/constants/soundCategoryColors'
import type { ScenePreset, Sound } from '@/types/music'

const FEATURED_SCENE_ID_SET: ReadonlySet<string> = new Set(FEATURED_SCENE_IDS)

function SearchResults({
  scenes,
  sounds,
  query,
  onPlayScene,
  onToggleSound,
  activeSoundIds,
  loadingSoundIds,
  errorSoundIds,
}: {
  scenes: ScenePreset[]
  sounds: Sound[]
  query: string
  onPlayScene: (scene: ScenePreset) => void
  onToggleSound: (sound: Sound) => void
  activeSoundIds: Set<string>
  loadingSoundIds: Set<string>
  errorSoundIds: Set<string>
}) {
  const hasResults = scenes.length > 0 || sounds.length > 0

  return (
    <div className="space-y-6">
      {!hasResults && (
        <p className="text-center text-sm text-white/60">
          No sounds or scenes match &apos;{query}&apos;
        </p>
      )}
      {scenes.length > 0 && (
        <div className="space-y-3">
          <SectionHeader as="h3">Scenes</SectionHeader>
          {scenes.map((scene) => (
            <button
              key={scene.id}
              type="button"
              onClick={() => onPlayScene(scene)}
              className="flex w-full items-center gap-3 rounded-lg bg-white/[0.06] p-3 text-left transition-colors hover:bg-white/10"
              aria-label={`Play ${scene.name} — ${scene.description}`}
            >
              <img
                src={`/audio/artwork/${scene.artworkFilename}`}
                alt=""
                className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                loading="lazy"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{scene.name}</p>
                <p className="truncate text-xs text-white/60">{scene.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {sounds.length > 0 && (
        <div className="space-y-3">
          <SectionHeader as="h3">Sounds</SectionHeader>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {sounds.map((sound) => {
              const tokens = SOUND_CATEGORY_COLORS[sound.category] ?? SOUND_CATEGORY_COLORS.nature
              return (
                <SoundCard
                  key={sound.id}
                  sound={sound}
                  categoryTokens={tokens}
                  isActive={activeSoundIds.has(sound.id)}
                  isLoading={loadingSoundIds.has(sound.id)}
                  hasError={errorSoundIds.has(sound.id)}
                  onToggle={onToggleSound}
                />
              )
            })}
          </div>
        </div>
      )}
      <p className="text-center text-xs text-white/60">
        Not finding it?{' '}
        <span className="text-primary-lt/50">
          Search all music (coming soon)
        </span>
      </p>
    </div>
  )
}

export function AmbientBrowser() {
  const search = useAmbientSearch()
  const scenePlayer = useScenePlayer()
  const soundToggle = useSoundToggle()
  const { isAuthenticated } = useAuth()
  const { mixes } = useSavedMixes()
  const activeSounds = useAudioState().activeSounds
  const activeSoundIds = useMemo(
    () => new Set(activeSounds.map((s) => s.soundId)),
    [activeSounds],
  )

  const featuredScenes = FEATURED_SCENE_IDS
    .map((id) => SCENE_BY_ID.get(id))
    .filter((s): s is ScenePreset => s !== undefined)

  // All Scenes grid excludes scenes already shown in the Featured row (dedupe)
  const allOtherScenes = useMemo(
    () => search.filteredScenes.filter((scene) => !FEATURED_SCENE_ID_SET.has(scene.id)),
    [search.filteredScenes],
  )

  const activeSceneName = scenePlayer.activeSceneId
    ? (SCENE_BY_ID.get(scenePlayer.activeSceneId)?.name ?? '')
    : ''

  return (
    <div className="space-y-8">
      {/* Search and filter hidden in visual polish — keeping for future re-enable */}

      {search.hasActiveSearch ? (
        <SearchResults
          scenes={search.filteredScenes}
          sounds={search.filteredSounds}
          query={search.searchQuery}
          onPlayScene={scenePlayer.loadScene}
          onToggleSound={soundToggle.toggleSound}
          activeSoundIds={activeSoundIds}
          loadingSoundIds={soundToggle.loadingSoundIds}
          errorSoundIds={soundToggle.errorSoundIds}
        />
      ) : (
        <>
          {/* Your Saved Mixes (logged-in users with mixes only) */}
          {isAuthenticated && mixes.length > 0 && (
            <section aria-label="Your saved mixes">
              <SectionHeader>Your Saved Mixes</SectionHeader>
              <div className="scrollbar-none flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
                {mixes.map((mix) => (
                  <div key={mix.id} className="min-w-[200px] flex-shrink-0 sm:min-w-0">
                    <SavedMixCard mix={mix} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Featured Scenes */}
          <section aria-label="Featured scenes">
            <SectionHeader>Featured</SectionHeader>
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 scrollbar-none sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
              {featuredScenes.map((scene) => (
                <FeaturedSceneCard
                  key={scene.id}
                  scene={scene}
                  isActive={scenePlayer.activeSceneId === scene.id}
                  onPlay={scenePlayer.loadScene}
                />
              ))}
            </div>
          </section>

          {/* All Scenes Grid — excludes featured scenes (dedupe) */}
          {allOtherScenes.length > 0 && (
            <section aria-label="All scenes">
              <SectionHeader>All Scenes</SectionHeader>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {allOtherScenes.map((scene) => (
                  <SceneCard
                    key={scene.id}
                    scene={scene}
                    isActive={scenePlayer.activeSceneId === scene.id}
                    onPlay={scenePlayer.loadScene}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Build Your Own Mix */}
          {search.filteredSounds.length > 0 && (
            <section aria-label="Build your own mix">
              <div className="rounded-xl border border-white/10 bg-white/[0.06] p-6">
                <SectionHeader>Build Your Own Mix</SectionHeader>
                <SoundGrid
                  activeSoundIds={activeSoundIds}
                  loadingSoundIds={soundToggle.loadingSoundIds}
                  errorSoundIds={soundToggle.errorSoundIds}
                  onToggle={soundToggle.toggleSound}
                  sounds={search.hasActiveFilters ? search.filteredSounds : undefined}
                />
              </div>
            </section>
          )}
        </>
      )}

      <SceneUndoToast
        undoAvailable={scenePlayer.undoAvailable}
        sceneName={activeSceneName}
        onUndo={scenePlayer.undoSceneSwitch}
      />

      {scenePlayer.pendingRoutineInterrupt && (
        <RoutineInterruptDialog
          onConfirm={scenePlayer.confirmRoutineInterrupt}
          onCancel={scenePlayer.cancelRoutineInterrupt}
        />
      )}
    </div>
  )
}
