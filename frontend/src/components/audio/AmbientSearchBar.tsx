import { Search, X } from 'lucide-react'

interface AmbientSearchBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onClear: () => void
}

export function AmbientSearchBar({
  searchQuery,
  onSearchChange,
  onClear,
}: AmbientSearchBarProps) {
  return (
    <div className="relative w-full">
      <Search
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
        aria-hidden="true"
      />
      <input
        type="search"
        aria-label="Search sounds and scenes"
        placeholder="Search sounds and scenes..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full rounded-lg border border-white/20 bg-[rgba(15,10,30,0.3)] py-3 pl-10 pr-10 text-sm text-white placeholder:text-white/50 focus:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/50 hover:text-white"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
