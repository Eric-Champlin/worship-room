interface RecentlyAddedItem {
  id: string
  title: string
  addedAt: Date
}

interface RecentlyAddedSectionProps {
  items?: RecentlyAddedItem[]
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

export function RecentlyAddedSection({ items }: RecentlyAddedSectionProps) {
  if (!items || items.length === 0) return null

  const now = Date.now()
  const recentItems = items.filter(
    (item) => now - item.addedAt.getTime() < THIRTY_DAYS_MS,
  )
  const olderItems = items.filter(
    (item) => now - item.addedAt.getTime() >= THIRTY_DAYS_MS,
  )

  // Hidden when all content is new (no older items exist)
  if (olderItems.length === 0) return null

  if (recentItems.length === 0) return null

  return (
    <section
      aria-label="Recently added content"
      className="mx-auto max-w-6xl px-4 py-4 sm:px-6"
    >
      <h2 className="mb-3 text-sm font-semibold text-text-dark">
        Recently Added
      </h2>
      <div className="scrollbar-none flex gap-3 overflow-x-auto">
        {recentItems.map((item) => {
          const isNew = now - item.addedAt.getTime() < FOURTEEN_DAYS_MS
          return (
            <div
              key={item.id}
              className="flex-shrink-0 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-text-dark shadow-sm"
            >
              <div className="flex items-center gap-2">
                {item.title}
                {isNew && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
                    New
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
