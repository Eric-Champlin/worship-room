import type { BookmarkData } from '@/types/my-bible'

interface BookmarkCardProps {
  data: BookmarkData
  verseText: string | null
}

export function BookmarkCard({ data, verseText }: BookmarkCardProps) {
  return (
    <div className="mt-2 space-y-1">
      {verseText ? (
        <p className="text-sm text-white">{verseText}</p>
      ) : (
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
      )}
      {data.label && (
        <p className="text-sm italic text-white/50">{data.label}</p>
      )}
    </div>
  )
}
