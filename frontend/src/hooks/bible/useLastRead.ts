import { useState, useEffect } from 'react'
import { useTimeTick } from './useTimeTick'
import { getLastRead } from '@/lib/bible/landingState'
import { formatRelativeReadTime } from '@/lib/bible/timeFormat'
import { loadChapterWeb, getAdjacentChapter } from '@/data/bible'
import { BIBLE_BOOKS } from '@/constants/bible'

const TWENTY_FOUR_HOURS = 86_400_000
const FIRST_LINE_MAX_CHARS = 80

export interface LastReadState {
  book: string | null
  chapter: number | null
  timestamp: number | null
  isActiveReader: boolean
  isLapsedReader: boolean
  isFirstTimeReader: boolean
  relativeTime: string
  firstLineOfChapter: string | null
  slug: string | null
  nextChapter: { bookSlug: string; bookName: string; chapter: number } | null
}

const FIRST_TIME_DEFAULTS: LastReadState = {
  book: null,
  chapter: null,
  timestamp: null,
  isActiveReader: false,
  isLapsedReader: false,
  isFirstTimeReader: true,
  relativeTime: '',
  firstLineOfChapter: null,
  slug: null,
  nextChapter: null,
}

export function useLastRead(): LastReadState {
  // SSR guard
  if (typeof window === 'undefined') {
    return FIRST_TIME_DEFAULTS
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { now } = useTimeTick()
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [state, setState] = useState<LastReadState>(FIRST_TIME_DEFAULTS)

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const lastRead = getLastRead()

    if (!lastRead) {
      setState(FIRST_TIME_DEFAULTS)
      return
    }

    const nowMs = now.getTime()
    const isActive = nowMs - lastRead.timestamp < TWENTY_FOUR_HOURS
    const bookEntry = BIBLE_BOOKS.find((b) => b.name === lastRead.book)
    const slug = bookEntry?.slug ?? lastRead.book.toLowerCase()
    const next = getAdjacentChapter(slug, lastRead.chapter, 'next')

    const derived: LastReadState = {
      book: lastRead.book,
      chapter: lastRead.chapter,
      timestamp: lastRead.timestamp,
      isActiveReader: isActive,
      isLapsedReader: !isActive,
      isFirstTimeReader: false,
      relativeTime: formatRelativeReadTime(lastRead.timestamp, nowMs),
      firstLineOfChapter: state.firstLineOfChapter,
      slug,
      nextChapter: next,
    }

    setState(derived)

    // Load first line of chapter (async)
    loadChapterWeb(slug, lastRead.chapter).then((chapter) => {
      if (!chapter || chapter.verses.length === 0) return
      const text = chapter.verses[0].text
      const firstLine =
        text.length > FIRST_LINE_MAX_CHARS
          ? text.slice(0, FIRST_LINE_MAX_CHARS).trimEnd() + '…'
          : text
      setState((prev) => ({ ...prev, firstLineOfChapter: firstLine }))
    }).catch(() => { /* silent — first line is a nice-to-have */ })
    // Re-derive on every time tick (picks up fresh localStorage writes too)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now])

  return state
}
