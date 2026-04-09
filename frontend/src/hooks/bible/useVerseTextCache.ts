import { useCallback, useRef, useState } from 'react'
import { loadChapterWeb } from '@/data/bible/index'
import type { ActivityItem } from '@/types/my-bible'

type ChapterKey = string // `${book}:${chapter}`
type VerseMap = Map<number, string>

function chapterKey(book: string, chapter: number): ChapterKey {
  return `${book}:${chapter}`
}

export function useVerseTextCache() {
  const cache = useRef(new Map<ChapterKey, VerseMap>())
  const loading = useRef(new Set<ChapterKey>())
  const [, setVersion] = useState(0)

  const getVerseText = useCallback(
    (book: string, chapter: number, startVerse: number, endVerse: number): string | null => {
      const key = chapterKey(book, chapter)
      const verseMap = cache.current.get(key)
      if (!verseMap) return null

      const texts: string[] = []
      for (let v = startVerse; v <= endVerse; v++) {
        const text = verseMap.get(v)
        if (text) texts.push(text)
      }
      return texts.length > 0 ? texts.join(' ') : null
    },
    [],
  )

  const preloadChapters = useCallback((items: ActivityItem[]): void => {
    const uniqueKeys = new Set<ChapterKey>()
    for (const item of items) {
      uniqueKeys.add(chapterKey(item.book, item.chapter))
    }

    for (const key of uniqueKeys) {
      if (cache.current.has(key) || loading.current.has(key)) continue
      loading.current.add(key)

      const [book, chapterStr] = key.split(':')
      const chapter = parseInt(chapterStr, 10)

      loadChapterWeb(book, chapter).then((chapterData) => {
        loading.current.delete(key)
        if (!chapterData) return

        const verseMap: VerseMap = new Map()
        for (const verse of chapterData.verses) {
          verseMap.set(verse.number, verse.text)
        }
        cache.current.set(key, verseMap)
        setVersion((v) => v + 1)
      })
    }
  }, [])

  return { getVerseText, preloadChapters }
}
