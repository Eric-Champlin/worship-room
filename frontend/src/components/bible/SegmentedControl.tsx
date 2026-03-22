import { cn } from '@/lib/utils'

export type BibleBrowserMode = 'books' | 'search'

interface SegmentedControlProps {
  mode: BibleBrowserMode
  onModeChange: (mode: BibleBrowserMode) => void
}

export function SegmentedControl({ mode, onModeChange }: SegmentedControlProps) {
  return (
    <div
      className="mx-auto mt-6 flex w-fit rounded-full border border-white/15 bg-white/5 p-1"
      role="tablist"
      aria-label="Bible browser mode"
    >
      <button
        role="tab"
        aria-selected={mode === 'books'}
        onClick={() => onModeChange('books')}
        className={cn(
          'min-h-[44px] rounded-full px-6 py-2 text-sm font-medium transition-colors',
          mode === 'books'
            ? 'bg-primary text-white'
            : 'text-white/70 hover:text-white',
        )}
      >
        Books
      </button>
      <button
        role="tab"
        aria-selected={mode === 'search'}
        onClick={() => onModeChange('search')}
        className={cn(
          'min-h-[44px] rounded-full px-6 py-2 text-sm font-medium transition-colors',
          mode === 'search'
            ? 'bg-primary text-white'
            : 'text-white/70 hover:text-white',
        )}
      >
        Search
      </button>
    </div>
  )
}
