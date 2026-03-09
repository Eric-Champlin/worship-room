import { useAuth } from '@/hooks/useAuth'

interface ContinueListening {
  title: string
  type: string
  onPlay: () => void
}

interface FavoriteItem {
  id: string
  title: string
}

interface SavedMix {
  id: string
  title: string
}

interface PersonalizationSectionProps {
  continueListening?: ContinueListening
  favorites?: FavoriteItem[]
  savedMixes?: SavedMix[]
}

export function PersonalizationSection({
  continueListening,
  favorites,
  savedMixes,
}: PersonalizationSectionProps) {
  const { isLoggedIn } = useAuth()

  if (!isLoggedIn) return null

  const hasFavorites = favorites && favorites.length > 0
  const hasSavedMixes = savedMixes && savedMixes.length > 0

  if (!continueListening && !hasFavorites && !hasSavedMixes) return null

  return (
    <section
      aria-label="Personalized recommendations"
      className="mx-auto max-w-6xl px-4 py-6 sm:px-6"
    >
      {continueListening && (
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold text-text-dark">
            Continue Listening
          </h2>
          <button
            type="button"
            onClick={continueListening.onPlay}
            className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
              <span aria-hidden="true">&#9654;</span>
            </div>
            <div>
              <p className="text-sm font-medium text-text-dark">
                {continueListening.title}
              </p>
              <p className="text-xs text-text-light">
                {continueListening.type}
              </p>
            </div>
          </button>
        </div>
      )}

      {hasFavorites && favorites && (
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold text-text-dark">
            Your Favorites
          </h2>
          <div className="scrollbar-none flex gap-3 overflow-x-auto">
            {favorites.map((item) => (
              <div
                key={item.id}
                className="flex-shrink-0 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-text-dark shadow-sm"
              >
                {item.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {hasSavedMixes && savedMixes && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-text-dark">
            Your Saved Mixes
          </h2>
          <div className="scrollbar-none flex gap-3 overflow-x-auto">
            {savedMixes.map((mix) => (
              <div
                key={mix.id}
                className="flex-shrink-0 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-text-dark shadow-sm"
              >
                {mix.title}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
