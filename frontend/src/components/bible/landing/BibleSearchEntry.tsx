import { Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { parseReference } from '@/lib/search'

export function BibleSearchEntry() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return

    const ref = parseReference(trimmed)
    if (ref) {
      const verseSuffix = ref.verse !== undefined ? `?verse=${ref.verse}` : ''
      navigate(`/bible/${ref.book}/${ref.chapter}${verseSuffix}`)
      return
    }

    navigate(`/bible/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl">
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search verses or go to a passage (e.g., John 3:16)"
          aria-label="Search the Bible"
          className="w-full rounded-xl bg-white/[0.06] border border-white/[0.12] py-3.5 pl-12 pr-4 text-white placeholder:text-white/50 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 min-h-[44px]"
        />
      </div>
    </form>
  )
}
