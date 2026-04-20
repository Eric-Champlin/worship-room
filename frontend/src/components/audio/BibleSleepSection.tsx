import { useNavigate } from 'react-router-dom'
import { BookOpen, Play } from 'lucide-react'
import { useScenePlayer } from '@/hooks/useScenePlayer'
import { SCENE_BY_ID } from '@/data/scenes'
import { SectionHeader } from '@/components/ui/SectionHeader'

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
      <SectionHeader>Scripture Reading</SectionHeader>

      {/* "Read the Bible" hero card */}
      <a
        href="/bible"
        onClick={(e) => {
          e.preventDefault()
          navigate('/bible')
        }}
        className="group block overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] transition-shadow motion-reduce:transition-none hover:shadow-md hover:shadow-black/20"
      >
        <div className="h-1 bg-gradient-to-r from-amber-500 to-purple-600" />
        <div className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary-lt" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Read the Bible
            </h3>
            <p className="text-sm text-white/60">
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
              className="flex min-h-[44px] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-4 transition-shadow motion-reduce:transition-none hover:shadow-md hover:shadow-black/20"
              aria-label={`Start ${scene.name} and read ${option.bookLabel}`}
            >
              <Play className="h-4 w-4 flex-shrink-0 text-primary-lt" aria-hidden="true" />
              <div className="text-left">
                <span className="block text-sm font-medium text-white">
                  {scene.name}
                </span>
                <span className="block text-xs text-white/60">
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
