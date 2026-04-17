import { describe, it, expect } from 'vitest'

import * as routeMetadata from '../routeMetadata'
import {
  buildBibleChapterMetadata,
  buildBiblePlanDayMetadata,
  buildBiblePlanMetadata,
  buildBibleSearchMetadata,
  type StaticRouteMetadata,
} from '../routeMetadata'

// ─── Constants used across the length-limit tests ─────────────────────────

const TITLE_SUFFIX_LENGTH = ' | Worship Room'.length // 15
const SUFFIXED_TITLE_MAX = 60 - TITLE_SUFFIX_LENGTH // 45
const NOSUFFIX_TITLE_MAX = 60
const DESCRIPTION_MAX = 160

// Collect every exported StaticRouteMetadata constant via module reflection
// so adding a new constant automatically gains the length-limit tests.
type StaticEntry = [string, StaticRouteMetadata]
const STATIC_ENTRIES: StaticEntry[] = Object.entries(routeMetadata).filter(
  (entry): entry is StaticEntry => {
    const [, value] = entry
    return (
      typeof value === 'object' &&
      value !== null &&
      'title' in value &&
      'description' in value
    )
  },
) as StaticEntry[]

// ─── Length-limit parameterized tests ─────────────────────────────────────

describe('routeMetadata — length limits (parameterized over every static constant)', () => {
  it('discovers at least 30 static metadata constants', () => {
    // Guards against a refactor silently dropping constants from the module
    expect(STATIC_ENTRIES.length).toBeGreaterThanOrEqual(30)
  })

  STATIC_ENTRIES.forEach(([name, meta]) => {
    it(`${name}: title is non-empty and within ${SUFFIXED_TITLE_MAX}/${NOSUFFIX_TITLE_MAX}-char budget`, () => {
      expect(meta.title.trim().length).toBeGreaterThan(0)
      const limit = meta.noSuffix ? NOSUFFIX_TITLE_MAX : SUFFIXED_TITLE_MAX
      expect(meta.title.length).toBeLessThanOrEqual(limit)
    })

    it(`${name}: description is non-empty and ≤${DESCRIPTION_MAX} chars`, () => {
      expect(meta.description.trim().length).toBeGreaterThan(0)
      expect(meta.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
    })

    it(`${name}: ogImage (if present) starts with /og/ or is /og-default.png`, () => {
      if (meta.ogImage !== undefined) {
        expect(
          meta.ogImage.startsWith('/og/') || meta.ogImage === '/og-default.png',
          `expected ${name}.ogImage to start with /og/ or be /og-default.png, got ${meta.ogImage}`,
        ).toBe(true)
      }
    })
  })
})

// ─── Specific constant identity tests ─────────────────────────────────────

describe('routeMetadata — approved constants (iteration 3)', () => {
  it('HOME_METADATA uses noSuffix and the shipped positioning title', () => {
    expect(routeMetadata.HOME_METADATA.noSuffix).toBe(true)
    expect(routeMetadata.HOME_METADATA.title).toBe(
      'Worship Room — Christian Emotional Healing & Worship',
    )
    expect(routeMetadata.HOME_METADATA.ogImage).toBe('/og/home.png')
  })

  it('DAILY_HUB_PRAY_METADATA is "Write a Prayer" after iter 2', () => {
    expect(routeMetadata.DAILY_HUB_PRAY_METADATA.title).toBe('Write a Prayer')
  })

  it('DAILY_HUB_MEDITATE_METADATA is "Contemplative Prayer" after iter 3', () => {
    expect(routeMetadata.DAILY_HUB_MEDITATE_METADATA.title).toBe('Contemplative Prayer')
    expect(routeMetadata.DAILY_HUB_MEDITATE_METADATA.description).toContain(
      'Christian tradition',
    )
  })

  it('FRIENDS_METADATA title is just "Friends" after iter 3', () => {
    expect(routeMetadata.FRIENDS_METADATA.title).toBe('Friends')
    expect(routeMetadata.FRIENDS_METADATA.noIndex).toBe(true)
  })

  it('INSIGHTS_METADATA title is "Mood & Practice Insights" after iter 3', () => {
    expect(routeMetadata.INSIGHTS_METADATA.title).toBe('Mood & Practice Insights')
    expect(routeMetadata.INSIGHTS_METADATA.description).not.toContain('spiritual growth')
  })

  it('BIBLE_PLANS_BROWSER_METADATA title is "Reading Plans for Hard Days" after iter 3', () => {
    expect(routeMetadata.BIBLE_PLANS_BROWSER_METADATA.title).toBe(
      'Reading Plans for Hard Days',
    )
  })

  it('MY_BIBLE_METADATA sets noIndex', () => {
    expect(routeMetadata.MY_BIBLE_METADATA.noIndex).toBe(true)
  })

  it('REGISTER_METADATA sets noIndex (BB-40 adds)', () => {
    expect(routeMetadata.REGISTER_METADATA.noIndex).toBe(true)
  })

  it('every meditate sub-page constant sets noIndex', () => {
    expect(routeMetadata.MEDITATE_BREATHING_METADATA.noIndex).toBe(true)
    expect(routeMetadata.MEDITATE_SOAKING_METADATA.noIndex).toBe(true)
    expect(routeMetadata.MEDITATE_GRATITUDE_METADATA.noIndex).toBe(true)
    expect(routeMetadata.MEDITATE_ACTS_METADATA.noIndex).toBe(true)
    expect(routeMetadata.MEDITATE_PSALMS_METADATA.noIndex).toBe(true)
    expect(routeMetadata.MEDITATE_EXAMEN_METADATA.noIndex).toBe(true)
  })

  it('all public content constants do NOT set noIndex', () => {
    expect(routeMetadata.HOME_METADATA.noIndex).toBeFalsy()
    expect(routeMetadata.DAILY_HUB_DEVOTIONAL_METADATA.noIndex).toBeFalsy()
    expect(routeMetadata.DAILY_HUB_PRAY_METADATA.noIndex).toBeFalsy()
    expect(routeMetadata.BIBLE_LANDING_METADATA.noIndex).toBeFalsy()
    expect(routeMetadata.ASK_METADATA.noIndex).toBeFalsy()
    expect(routeMetadata.GROW_METADATA.noIndex).toBeFalsy()
    expect(routeMetadata.PRAYER_WALL_METADATA.noIndex).toBeFalsy()
    expect(routeMetadata.CHURCHES_METADATA.noIndex).toBeFalsy()
  })
})

// ─── buildBibleChapterMetadata ────────────────────────────────────────────

describe('buildBibleChapterMetadata', () => {
  it('returns expected metadata for Philippians 4', () => {
    const meta = buildBibleChapterMetadata('Philippians', 4, 'philippians')
    expect(meta.title).toBe('Philippians 4 (WEB)')
    expect(meta.description).toContain('Read Philippians chapter 4')
    expect(meta.description).toContain('World English Bible')
    expect(meta.canonical).toBe('/bible/philippians/4')
    expect(meta.ogImage).toBe('/og/bible-chapter.png')
    expect(meta.ogImageAlt).toBe('Philippians 4 — World English Bible')
  })

  it('handles the longest chapter reference (Psalms 119)', () => {
    const meta = buildBibleChapterMetadata('Psalms', 119, 'psalms')
    expect(meta.title).toBe('Psalms 119 (WEB)')
    expect(meta.title.length).toBeLessThanOrEqual(SUFFIXED_TITLE_MAX)
    expect(meta.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
  })

  it('handles the longest book name (Song of Solomon)', () => {
    const meta = buildBibleChapterMetadata('Song of Solomon', 8, 'song-of-solomon')
    expect(meta.title).toBe('Song of Solomon 8 (WEB)')
    expect(meta.title.length).toBeLessThanOrEqual(SUFFIXED_TITLE_MAX)
  })

  it('emits a BreadcrumbList JSON-LD with 4 ListItems', () => {
    const meta = buildBibleChapterMetadata('Genesis', 1, 'genesis')
    const jsonLd = meta.jsonLd as Record<string, unknown>
    expect(jsonLd['@context']).toBe('https://schema.org')
    expect(jsonLd['@type']).toBe('BreadcrumbList')
    const items = jsonLd.itemListElement as Array<Record<string, unknown>>
    expect(items).toHaveLength(4)
    expect(items[0].name).toBe('Worship Room')
    expect(items[1].name).toBe('Study Bible')
    expect(items[2].name).toBe('Genesis')
    expect(items[3].name).toBe('Genesis 1')
    // Positions ascend from 1
    items.forEach((item, idx) => {
      expect(item.position).toBe(idx + 1)
    })
  })
})

// ─── buildBiblePlanMetadata ───────────────────────────────────────────────

describe('buildBiblePlanMetadata', () => {
  it('uses the per-slug OG image for psalms-30-days', () => {
    const meta = buildBiblePlanMetadata(
      'psalms-30-days',
      '30 Days in the Psalms',
      'A plan about the Psalms.',
    )
    expect(meta.title).toBe('30 Days in the Psalms')
    expect(meta.ogImage).toBe('/og/plans/psalms-30-days.png')
    expect(meta.canonical).toBe('/bible/plans/psalms-30-days')
  })

  it('uses the per-slug OG image for john-story-of-jesus', () => {
    const meta = buildBiblePlanMetadata('john-story-of-jesus', 'The Story of Jesus', 'desc')
    expect(meta.ogImage).toBe('/og/plans/john-story-of-jesus.png')
  })

  it("uses the per-slug OG image for when-youre-anxious", () => {
    const meta = buildBiblePlanMetadata("when-youre-anxious", "When You're Anxious", 'desc')
    expect(meta.ogImage).toBe('/og/plans/when-youre-anxious.png')
  })

  it('uses the per-slug OG image for when-you-cant-sleep', () => {
    const meta = buildBiblePlanMetadata('when-you-cant-sleep', "When You Can't Sleep", 'desc')
    expect(meta.ogImage).toBe('/og/plans/when-you-cant-sleep.png')
  })

  it('falls back to /og/bible-chapter.png for unknown slug', () => {
    const meta = buildBiblePlanMetadata('unknown-slug', 'Unknown Plan', 'desc')
    expect(meta.ogImage).toBe('/og/bible-chapter.png')
  })

  it('truncates a too-long description to <=160 chars with ellipsis', () => {
    const longDesc = 'a'.repeat(500)
    const meta = buildBiblePlanMetadata('psalms-30-days', 'Psalms', longDesc)
    expect(meta.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
    expect(meta.description.endsWith('…')).toBe(true)
  })

  it('does not truncate a short description', () => {
    const shortDesc = 'A short plan description.'
    const meta = buildBiblePlanMetadata('psalms-30-days', 'Psalms', shortDesc)
    expect(meta.description).toBe(shortDesc)
    expect(meta.description.endsWith('…')).toBe(false)
  })

  it('truncates a too-long plan title', () => {
    const longTitle = 'a'.repeat(100)
    const meta = buildBiblePlanMetadata('psalms-30-days', longTitle, 'desc')
    expect(meta.title.length).toBeLessThanOrEqual(SUFFIXED_TITLE_MAX)
    expect(meta.title.endsWith('…')).toBe(true)
  })

  it('emits a BreadcrumbList JSON-LD with 3 ListItems', () => {
    const meta = buildBiblePlanMetadata('psalms-30-days', '30 Days in the Psalms', 'desc')
    const jsonLd = meta.jsonLd as Record<string, unknown>
    expect(jsonLd['@type']).toBe('BreadcrumbList')
    const items = jsonLd.itemListElement as Array<Record<string, unknown>>
    expect(items).toHaveLength(3)
    expect(items[0].name).toBe('Study Bible')
    expect(items[1].name).toBe('Plans')
    expect(items[2].name).toBe('30 Days in the Psalms')
  })
})

// ─── buildBiblePlanDayMetadata ────────────────────────────────────────────

describe('buildBiblePlanDayMetadata', () => {
  it('builds expected day title and canonical override', () => {
    const meta = buildBiblePlanDayMetadata('psalms-30-days', '30 Days in the Psalms', 5, 'Psalm 23')
    expect(meta.title).toBe('Day 5: Psalm 23')
    expect(meta.canonical).toBe('/bible/plans/psalms-30-days/day/5')
  })

  it('uses the per-slug OG image', () => {
    const meta = buildBiblePlanDayMetadata('psalms-30-days', 'Psalms', 1, 'Day One')
    expect(meta.ogImage).toBe('/og/plans/psalms-30-days.png')
  })

  it('emits a BreadcrumbList JSON-LD with 4 ListItems', () => {
    const meta = buildBiblePlanDayMetadata('psalms-30-days', 'Psalms', 5, 'Psalm 23')
    const jsonLd = meta.jsonLd as Record<string, unknown>
    expect(jsonLd['@type']).toBe('BreadcrumbList')
    const items = jsonLd.itemListElement as Array<Record<string, unknown>>
    expect(items).toHaveLength(4)
    expect(items[3].name).toBe('Day 5')
  })

  it('truncates a too-long day title so title stays within budget', () => {
    const longDayTitle = 'a'.repeat(200)
    const meta = buildBiblePlanDayMetadata('psalms-30-days', 'Psalms', 30, longDayTitle)
    expect(meta.title.length).toBeLessThanOrEqual(SUFFIXED_TITLE_MAX)
    expect(meta.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
  })
})

// ─── buildBibleSearchMetadata ─────────────────────────────────────────────

describe('buildBibleSearchMetadata', () => {
  it('returns the default "Search the Bible" metadata for null query', () => {
    const meta = buildBibleSearchMetadata(null)
    expect(meta.title).toBe('Search the Bible')
    expect(meta.description).toContain('Search the entire World English Bible')
    expect(meta.canonical).toBeUndefined()
  })

  it('returns the default for undefined query', () => {
    const meta = buildBibleSearchMetadata(undefined)
    expect(meta.title).toBe('Search the Bible')
  })

  it('returns the default for empty-string query', () => {
    const meta = buildBibleSearchMetadata('')
    expect(meta.title).toBe('Search the Bible')
  })

  it('returns the default for whitespace-only query', () => {
    const meta = buildBibleSearchMetadata('   ')
    expect(meta.title).toBe('Search the Bible')
  })

  it('returns "Search: love" for valid query', () => {
    const meta = buildBibleSearchMetadata('love')
    expect(meta.title).toBe('Search: love')
    expect(meta.description).toContain('"love"')
  })

  it('truncates very long queries to 37 chars to stay within title budget', () => {
    const meta = buildBibleSearchMetadata('a'.repeat(200))
    // "Search: " = 8 chars + 37-char query = 45 total, within the 45-char ceiling
    expect(meta.title.length).toBeLessThanOrEqual(SUFFIXED_TITLE_MAX)
  })

  it('has no canonical override so /bible?mode=search&q= canonical is preserved', () => {
    const withQuery = buildBibleSearchMetadata('love')
    const withoutQuery = buildBibleSearchMetadata(null)
    expect(withQuery.canonical).toBeUndefined()
    expect(withoutQuery.canonical).toBeUndefined()
  })
})
