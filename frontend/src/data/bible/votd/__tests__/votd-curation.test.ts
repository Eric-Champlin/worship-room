import { describe, expect, it } from 'vitest'
import votdList from '@/data/bible/votd/votd-list.json'
import { BIBLE_BOOKS } from '@/constants/bible'
import { loadChapterWeb } from '@/data/bible'
import type { VotdListEntry, VotdTheme } from '@/types/bible-landing'

const VALID_THEMES: VotdTheme[] = [
  'love', 'hope', 'peace', 'strength', 'faith', 'joy',
  'comfort', 'wisdom', 'forgiveness', 'provision', 'praise', 'presence',
]

const VALID_THEME_SET = new Set<string>(VALID_THEMES)

const GOSPEL_SLUGS = new Set(['matthew', 'mark', 'luke', 'john'])
const OT_NARRATIVE_SLUGS = new Set([
  'genesis', 'exodus', 'joshua', 'judges', 'ruth',
  '1-samuel', '2-samuel', '1-kings', '2-kings',
  '1-chronicles', '2-chronicles', 'ezra', 'nehemiah', 'esther',
])

const entries = votdList as VotdListEntry[]
const validSlugs = new Set(BIBLE_BOOKS.map((b) => b.slug))

describe('VOTD list curation', () => {
  it('has exactly 366 entries', () => {
    expect(entries).toHaveLength(366)
  })

  it('no duplicate entries', () => {
    const seen = new Set<string>()
    for (const entry of entries) {
      const key = `${entry.book}:${entry.chapter}:${entry.startVerse}:${entry.endVerse}`
      expect(seen.has(key), `Duplicate: ${key}`).toBe(false)
      seen.add(key)
    }
  })

  it('all book slugs match BIBLE_BOOKS', () => {
    for (const entry of entries) {
      expect(validSlugs.has(entry.book), `Invalid book slug: ${entry.book} (${entry.ref})`).toBe(
        true,
      )
    }
  })

  it('all themes are valid', () => {
    for (const entry of entries) {
      expect(
        VALID_THEME_SET.has(entry.theme),
        `Invalid theme "${entry.theme}" for ${entry.ref}`,
      ).toBe(true)
    }
  })

  it('Psalms entries ≤ 30% (max 110)', () => {
    const count = entries.filter((e) => e.book === 'psalms').length
    expect(count).toBeLessThanOrEqual(110)
  })

  it('Gospel entries ≥ 20% (min 73)', () => {
    const count = entries.filter((e) => GOSPEL_SLUGS.has(e.book)).length
    expect(count).toBeGreaterThanOrEqual(73)
  })

  it('OT narrative entries ≥ 10% (min 37)', () => {
    const count = entries.filter((e) => OT_NARRATIVE_SLUGS.has(e.book)).length
    expect(count).toBeGreaterThanOrEqual(37)
  })

  it('all 12 themes represented', () => {
    const themesFound = new Set(entries.map((e) => e.theme))
    for (const theme of VALID_THEMES) {
      expect(themesFound.has(theme), `Missing theme: ${theme}`).toBe(true)
    }
  })

  it(
    'every entry has valid verses in WEB data',
    async () => {
      const errors: string[] = []

      for (const entry of entries) {
        const chapter = await loadChapterWeb(entry.book, entry.chapter)
        if (!chapter) {
          errors.push(`Chapter not found: ${entry.ref} (${entry.book} ch${entry.chapter})`)
          continue
        }

        for (let v = entry.startVerse; v <= entry.endVerse; v++) {
          const verse = chapter.verses.find((vr) => vr.number === v)
          if (!verse) {
            errors.push(`Verse not found: ${entry.ref} verse ${v}`)
          } else if (verse.text.trim().length === 0) {
            errors.push(`Empty verse text: ${entry.ref} verse ${v}`)
          }
        }
      }

      expect(errors, errors.join('\n')).toHaveLength(0)
    },
    30_000,
  )
})
