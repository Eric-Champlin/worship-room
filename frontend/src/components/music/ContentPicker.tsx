import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { X, Mountain, BookOpen, Moon } from 'lucide-react'
import { SCENE_PRESETS } from '@/data/scenes'
import { SCRIPTURE_COLLECTIONS } from '@/data/music/scripture-readings'
import { BEDTIME_STORIES } from '@/data/music/bedtime-stories'
import { useFocusTrap } from '@/hooks/useFocusTrap'

type ContentType = 'scene' | 'scripture' | 'story'

interface ContentPickerProps {
  type: ContentType
  onSelect: (type: ContentType, contentId: string, name: string) => void
  onClose: () => void
}

const TAB_KEYS: ContentType[] = ['scene', 'scripture', 'story']

const TAB_CONFIG = {
  scene: { label: 'Scenes', Icon: Mountain },
  scripture: { label: 'Scripture', Icon: BookOpen },
  story: { label: 'Stories', Icon: Moon },
} as const

export function ContentPicker({ type, onSelect, onClose }: ContentPickerProps) {
  const [activeTab, setActiveTab] = useState<ContentType>(type)
  const containerRef = useFocusTrap(true, onClose)
  const titleId = useId()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      let nextIndex: number | null = null
      if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % TAB_KEYS.length
      else if (e.key === 'ArrowLeft')
        nextIndex = (currentIndex - 1 + TAB_KEYS.length) % TAB_KEYS.length
      else if (e.key === 'Home') nextIndex = 0
      else if (e.key === 'End') nextIndex = TAB_KEYS.length - 1
      if (nextIndex !== null) {
        e.preventDefault()
        setActiveTab(TAB_KEYS[nextIndex])
        tabRefs.current[nextIndex]?.focus()
      }
    },
    [],
  )

  // Lock body scroll while modal open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[90vh] w-full flex-col rounded-t-2xl border border-white/[0.12] sm:mx-4 sm:max-w-2xl sm:rounded-2xl"
        style={{ background: 'rgba(15, 10, 30, 0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.12] px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-white">
            Choose Content
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close picker"
            className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div role="tablist" aria-label="Content type" className="flex border-b border-white/[0.12] px-5">
          {TAB_KEYS.map((key, index) => {
            const { label, Icon } = TAB_CONFIG[key]
            const isActive = activeTab === key
            return (
              <button
                key={key}
                ref={(el) => {
                  tabRefs.current[index] = el
                }}
                type="button"
                role="tab"
                id={`picker-tab-${key}`}
                aria-selected={isActive}
                aria-controls={`picker-panel-${key}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(key)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70 ${
                  isActive
                    ? 'border-white/30 text-white'
                    : 'border-transparent text-white/60 hover:text-white'
                }`}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div
          role="tabpanel"
          id={`picker-panel-${activeTab}`}
          aria-labelledby={`picker-tab-${activeTab}`}
          className="flex-1 overflow-y-auto p-5"
        >
          {activeTab === 'scene' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SCENE_PRESETS.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => onSelect('scene', scene.id, scene.name)}
                  className="rounded-lg border border-white/[0.12] p-4 text-left transition-colors hover:border-white/[0.18] hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
                >
                  <p className="font-medium text-white">{scene.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-white/60">
                    {scene.description}
                  </p>
                  <p className="mt-2 text-xs text-white/60">
                    {scene.sounds.length} sounds
                  </p>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'scripture' && (
            <div className="space-y-6">
              {SCRIPTURE_COLLECTIONS.map((collection) => (
                <div key={collection.id}>
                  <h3 className="mb-3 text-sm font-semibold text-white">
                    {collection.name}
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {collection.readings.map((reading) => (
                      <button
                        key={reading.id}
                        type="button"
                        onClick={() =>
                          onSelect('scripture', reading.id, reading.title)
                        }
                        className="rounded-lg border border-white/[0.12] p-3 text-left transition-colors hover:border-white/[0.18] hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
                      >
                        <p className="text-sm font-medium text-white">
                          {reading.title}
                        </p>
                        <p className="mt-0.5 text-xs text-white/60">
                          {reading.scriptureReference}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'story' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {BEDTIME_STORIES.map((story) => (
                <button
                  key={story.id}
                  type="button"
                  onClick={() => onSelect('story', story.id, story.title)}
                  className="rounded-lg border border-white/[0.12] p-4 text-left transition-colors hover:border-white/[0.18] hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
                >
                  <p className="font-medium text-white">{story.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-white/60">
                    {story.description}
                  </p>
                  <p className="mt-2 text-xs text-white/60">
                    {Math.round(story.durationSeconds / 60)} min
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
