import { useCallback, useEffect, useMemo, useState } from 'react'
import { subscribe as subscribeHighlights } from '@/lib/bible/highlightStore'
import { subscribe as subscribeBookmarks } from '@/lib/bible/bookmarkStore'
import { subscribe as subscribeNotes } from '@/lib/bible/notes/store'
import { subscribe as subscribeStreak } from '@/lib/bible/streakStore'
import { subscribe as subscribeJournal } from '@/lib/bible/journalStore'
import { loadAllActivity, filterActivity, sortActivity } from '@/lib/bible/activityLoader'
import { getBibleStreak } from '@/lib/bible/landingState'
import { useVerseTextCache } from '@/hooks/bible/useVerseTextCache'
import type { ActivityItem, ActivityFilter, ActivitySort } from '@/types/my-bible'

interface TotalCounts {
  highlights: number
  notes: number
  bookmarks: number
  meditations: number
  booksSet: Set<string>
  streak: number
}

function computeTotalCounts(allItems: ActivityItem[]): TotalCounts {
  const counts: TotalCounts = {
    highlights: 0,
    notes: 0,
    bookmarks: 0,
    meditations: 0,
    booksSet: new Set<string>(),
    streak: 0,
  }

  for (const item of allItems) {
    switch (item.type) {
      case 'highlight':
        counts.highlights++
        break
      case 'note':
        counts.notes++
        break
      case 'bookmark':
        counts.bookmarks++
        break
      case 'meditation':
        counts.meditations++
        break
    }
    counts.booksSet.add(item.book)
  }

  const streakData = getBibleStreak()
  counts.streak = streakData?.count ?? 0

  return counts
}

const DEFAULT_FILTER: ActivityFilter = { type: 'all', book: 'all', color: 'all', searchQuery: '' }
const DEFAULT_SORT: ActivitySort = 'recent'

export function useActivityFeed() {
  const [allItems, setAllItems] = useState<ActivityItem[]>(() => loadAllActivity())
  const [filter, setFilter] = useState<ActivityFilter>(DEFAULT_FILTER)
  const [sort, setSort] = useState<ActivitySort>(DEFAULT_SORT)
  const { getVerseText, preloadChapters } = useVerseTextCache()

  // Subscribe to store changes
  useEffect(() => {
    const reload = () => {
      setAllItems(loadAllActivity())
    }
    const unsubs = [
      subscribeHighlights(reload),
      subscribeBookmarks(reload),
      subscribeNotes(reload),
      subscribeStreak(reload),
      subscribeJournal(reload),
    ]
    return () => unsubs.forEach((fn) => fn())
  }, [])

  const totalCounts = useMemo(() => computeTotalCounts(allItems), [allItems])

  const items = useMemo(() => {
    const filtered = filterActivity(allItems, filter, getVerseText)
    return sortActivity(filtered, sort)
  }, [allItems, filter, sort, getVerseText])

  // Preload verse text for filtered items
  useEffect(() => {
    if (items.length > 0) {
      preloadChapters(items)
    }
  }, [items, preloadChapters])

  // Book counts from ALL items (independent of type/book filters) so the book
  // dropdown always shows every book that has any activity.
  const bookCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of allItems) {
      counts.set(item.book, (counts.get(item.book) ?? 0) + 1)
    }
    return counts
  }, [allItems])

  const isEmpty = allItems.length === 0
  const isFilteredEmpty = !isEmpty && items.length === 0

  const clearFilters = useCallback(() => {
    setFilter(DEFAULT_FILTER)
    setSort(DEFAULT_SORT)
  }, [])

  return {
    items,
    filter,
    sort,
    setFilter,
    setSort,
    totalCounts,
    bookCounts,
    isEmpty,
    isFilteredEmpty,
    clearFilters,
    getVerseText,
  }
}
