import { useNavigate } from 'react-router-dom'
import { BookOpen, Play } from 'lucide-react'
import { useScenePlayer } from '@/hooks/useScenePlayer'
import { SCENE_BY_ID } from '@/data/scenes'

const QUICK_START_OPTIONS = [
  {
    sceneId: 'peaceful-study',
    bookPath: '/bible/psalms/1?autoplay=true',
    bookLabel: 'Psalms 1',
  },
  {
    sceneId: 'evening-scripture',
    bookPath: '/bible/proverbs/1?autoplay=true',
    bookLabel: 'Proverbs 1',
  },
  {
    sceneId: 'sacred-space',
    bookPath: '/bible/john/1?autoplay=true',
    bookLabel: 'John 1',
  },
] as const

export function BibleSleepSection() {
  const navigate = useNavigate()
  const { loadScene } = useScenePlayer()

  const handleQuickStart = (sceneId: string, bookPath: string) => {
    const scene = SCENE_BY_ID.get(sceneId)
    if (!scene) return

    // loadScene is auth-gated internally — shows auth modal for logged-out users
    loadScene(scene)

    // Navigate to Bible page (always allowed, autoplay is auth-gated in BibleReader)
    setTimeout(() => {
      navigate(bookPath)
    }, 300)
  }

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-text-dark">
        Scripture Reading
      </h2>

      {/* "Read the Bible" hero card */}
      <a
        href="/bible"
        onClick={(e) => {
          e.preventDefault()
          navigate('/bible')
        }}
        className="group block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="h-1 bg-gradient-to-r from-amber-500 to-purple-600" />
        <div className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50">
            <BookOpen className="h-6 w-6 text-amber-600" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-dark">
              Read the Bible
            </h3>
            <p className="text-sm text-text-light">
              Fall asleep to any chapter read aloud
            </p>
          </div>
        </div>
      </a>

      {/* Quick-start cards */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {QUICK_START_OPTIONS.map((option) => {
          const scene = SCENE_BY_ID.get(option.sceneId)
          if (!scene) return null

          return (
            <button
              key={option.sceneId}
              type="button"
              onClick={() => handleQuickStart(option.sceneId, option.bookPath)}
              className="flex min-h-[44px] items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              aria-label={`Start ${scene.name} and read ${option.bookLabel}`}
            >
              <Play className="h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
              <div className="text-left">
                <span className="block text-sm font-medium text-text-dark">
                  {scene.name}
                </span>
                <span className="block text-xs text-text-light">
                  {option.bookLabel}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
