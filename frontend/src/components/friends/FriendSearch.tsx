import { useCallback, useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import type { FriendProfile } from '@/types/dashboard'
import type { FriendSearchResult } from '@/hooks/useFriends'
import { Avatar } from '@/components/prayer-wall/Avatar'
import { splitDisplayName } from './utils'

interface FriendSearchProps {
  searchUsers: (query: string) => FriendSearchResult[]
  onSendRequest: (profile: FriendProfile) => void
  inputRef?: React.RefObject<HTMLInputElement | null>
}

export function FriendSearch({ searchUsers, onSendRequest, inputRef }: FriendSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FriendSearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const internalInputRef = useRef<HTMLInputElement | null>(null)
  const effectiveInputRef = inputRef || internalInputRef
  const optionRefs = useRef<(HTMLDivElement | null)[]>([])

  const doSearch = useCallback(
    (q: string) => {
      if (q.length < 2) {
        setResults([])
        setIsOpen(false)
        setActiveIndex(-1)
        return
      }
      const found = searchUsers(q)
      setResults(found)
      setIsOpen(true)
      setActiveIndex(-1)
    },
    [searchUsers],
  )

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 300)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
      return
    }

    if (!isOpen || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => {
        const next = prev < results.length - 1 ? prev + 1 : 0
        optionRefs.current[next]?.scrollIntoView?.({ block: 'nearest' })
        return next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => {
        const next = prev > 0 ? prev - 1 : results.length - 1
        optionRefs.current[next]?.scrollIntoView?.({ block: 'nearest' })
        return next
      })
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      const user = results[activeIndex]
      if (user.status === 'none') {
        onSendRequest(user)
      }
    }
  }

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const activeDescendantId = activeIndex >= 0 ? `search-option-${results[activeIndex]?.id}` : undefined

  return (
    <div ref={containerRef} className="relative w-full sm:max-w-[500px]">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40"
          aria-hidden="true"
        />
        <input
          ref={effectiveInputRef as React.Ref<HTMLInputElement>}
          type="text"
          role="combobox"
          aria-label="Search for friends"
          aria-expanded={isOpen}
          aria-controls={isOpen ? 'friend-search-listbox' : undefined}
          aria-activedescendant={activeDescendantId}
          aria-autocomplete="list"
          placeholder="Search by name..."
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
      </div>

      {isOpen && (
        <div
          id="friend-search-listbox"
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 right-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-xl border border-white/15 bg-hero-mid shadow-lg"
        >
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-white/40">
              No users found for &lsquo;{query}&rsquo;
            </div>
          ) : (
            results.map((user, index) => {
              const { first, last } = splitDisplayName(user.displayName)
              const isActive = index === activeIndex
              return (
                <div
                  key={user.id}
                  ref={(el) => { optionRefs.current[index] = el }}
                  id={`search-option-${user.id}`}
                  role="option"
                  aria-selected={isActive}
                  className={`flex min-h-[44px] items-center gap-3 px-4 py-2 ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
                >
                  <Avatar
                    firstName={first}
                    lastName={last}
                    avatarUrl={user.avatar || null}
                    size="sm"
                    userId={user.id}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-white">{user.displayName}</span>
                    <span className="ml-2 text-sm text-white/50">{user.levelName}</span>
                  </div>
                  <div className="flex-shrink-0">
                    {user.status === 'friend' && (
                      <span className="text-sm text-white/40">Already friends</span>
                    )}
                    {(user.status === 'pending-incoming' || user.status === 'pending-outgoing') && (
                      <span className="text-sm text-white/40">Request pending</span>
                    )}
                    {user.status === 'none' && (
                      <button
                        onClick={() => onSendRequest(user)}
                        tabIndex={-1}
                        className="rounded-full bg-primary px-3 py-1 text-sm text-white transition-colors hover:bg-primary-lt"
                      >
                        Add Friend
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
