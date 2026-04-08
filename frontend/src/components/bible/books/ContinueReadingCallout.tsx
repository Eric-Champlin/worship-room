import { BookOpen, ChevronRight } from 'lucide-react'

interface ContinueReadingCalloutProps {
  bookName: string
  chapter: number
  timestamp: number
  onSelect: () => void
}

// Terse format ("5m ago") for compact drawer UI — distinct from timeAgo() in @/lib/time
// which uses verbose format ("5 minutes ago") and takes an ISO string.
function relativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

export function ContinueReadingCallout({
  bookName,
  chapter,
  timestamp,
  onSelect,
}: ContinueReadingCalloutProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Continue reading ${bookName} chapter ${chapter}`}
      className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-white/[0.15] bg-white/[0.08] p-4 text-left transition-colors hover:bg-white/[0.12]"
    >
      <BookOpen size={20} className="shrink-0 text-primary-lt" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">Continue reading</p>
        <p className="text-xs text-white/50">
          Chapter {chapter} · {relativeTime(timestamp)}
        </p>
      </div>
      <ChevronRight size={16} className="shrink-0 text-white/40" aria-hidden="true" />
    </button>
  )
}
