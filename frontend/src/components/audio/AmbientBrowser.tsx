import { useMemo } from 'react'
import { useAmbientSearch } from '@/hooks/useAmbientSearch'
import { useScenePlayer } from '@/hooks/useScenePlayer'
import { useSoundToggle } from '@/hooks/useSoundToggle'
import { useAuth } from '@/hooks/useAuth'
import { useSavedMixes } from '@/hooks/useSavedMixes'
import { useAudioState } from './AudioProvider'
import { FEATURED_SCENE_IDS, SCENE_BY_ID } from '@/data/scenes'
import { AmbientSearchBar } from './AmbientSearchBar'
import { AmbientFilterBar } from './AmbientFilterBar'
import { FeaturedSceneCard } from './FeaturedSceneCard'
import { SceneCard } from './SceneCard'
import { SoundGrid } from './SoundGrid'
import { SoundCard } from './SoundCard'
import { SceneUndoToast } from './SceneUndoToast'
import { SavedMixCard } from '@/components/music/SavedMixCard'
import { RoutineInterruptDialog } from './RoutineInterruptDialog'
import type { ScenePreset, Sound } from '@/types/music'

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
        <p className="text-center text-sm text-white/50">
          No sounds or scenes match &apos;{query}&apos;
        </p>
      )}
      {scenes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white/50">Scenes</h3>
          {scenes.map((scene) => (
            <button
              key={scene.id}
              type="button"
              onClick={() => onPlayScene(scene)}
              className="flex w-full items-center gap-3 rounded-lg bg-[rgba(15,10,30,0.3)] p-3 text-left transition-colors hover:bg-[rgba(15,10,30,0.5)]"
              aria-label={`Play ${scene.name} — ${scene.description}`}
            >
              <img
                src={`/audio/artwork/${scene.artworkFilename}`}
                alt=""
                className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{scene.name}</p>
                <p className="truncate text-xs text-white/50">{scene.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {sounds.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white/50">Sounds</h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {sounds.map((sound) => (
              <SoundCard
                key={sound.id}
                sound={sound}
                isActive={activeSoundIds.has(sound.id)}
                isLoading={loadingSoundIds.has(sound.id)}
                hasError={errorSoundIds.has(sound.id)}
                onToggle={onToggleSound}
              />
            ))}
          </div>
        </div>
      )}
      <p className="text-center text-xs text-white/50">
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
  const { isLoggedIn } = useAuth()
  const { mixes } = useSavedMixes()
  const activeSounds = useAudioState().activeSounds
  const activeSoundIds = useMemo(
    () => new Set(activeSounds.map((s) => s.soundId)),
    [activeSounds],
  )

  const featuredScenes = FEATURED_SCENE_IDS
    .map((id) => SCENE_BY_ID.get(id))
    .filter((s): s is ScenePreset => s !== undefined)

  const activeSceneName = scenePlayer.activeSceneId
    ? (SCENE_BY_ID.get(scenePlayer.activeSceneId)?.name ?? '')
    : ''

  return (
    <div className="space-y-8">
      <AmbientSearchBar
        searchQuery={search.searchQuery}
        onSearchChange={search.setSearchQuery}
        onClear={search.clearSearch}
      />

      <AmbientFilterBar
        filters={search.filters}
        onToggleFilter={search.toggleFilter}
        activeFilterCount={search.activeFilterCount}
        isFilterPanelOpen={search.isFilterPanelOpen}
        onSetFilterPanelOpen={search.setFilterPanelOpen}
      />

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
          {isLoggedIn && mixes.length > 0 && (
            <section aria-label="Your saved mixes">
              <h2 className="mb-3 text-sm font-semibold text-white">
                Your Saved Mixes
              </h2>
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

          {/* All Scenes Grid */}
          {search.filteredScenes.length > 0 && (
            <section aria-label="All scenes">
              <h2 className="mb-4 text-base font-medium text-white">All Scenes</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {search.filteredScenes.map((scene) => (
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
              <h2 className="mb-4 text-base font-medium text-white">Build Your Own Mix</h2>
              <SoundGrid
                activeSoundIds={activeSoundIds}
                loadingSoundIds={soundToggle.loadingSoundIds}
                errorSoundIds={soundToggle.errorSoundIds}
                onToggle={soundToggle.toggleSound}
                sounds={search.hasActiveFilters ? search.filteredSounds : undefined}
              />
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
