/**
 * BB-40 Step 8: BiblePlanDay SEO integration test.
 *
 * Same approach as BiblePlanDetail.seo.test.tsx — tests the builder contract
 * that BiblePlanDay.tsx uses inline:
 *
 *   <SEO {...buildBiblePlanDayMetadata(plan.slug, plan.title, dayNumber, day.title)} />
 *
 * Critical assertion: the canonical override must strip `?verse=` from the
 * query string so `/bible/plans/psalms-30-days/day/5?verse=3` canonicalizes
 * to `/bible/plans/psalms-30-days/day/5`. The builder sets `canonical` to the
 * clean path; `buildCanonicalUrl` then sees the override and drops all query
 * params — see `canonicalUrl.test.ts` for the suppression test.
 */
import { describe, it, expect } from 'vitest'
import { buildBiblePlanDayMetadata } from '@/lib/seo/routeMetadata'
import { buildCanonicalUrl } from '@/lib/seo/canonicalUrl'

describe('BiblePlanDay SEO — buildBiblePlanDayMetadata contract (BB-40 Step 8)', () => {
  it('produces correct title for Day 5: Psalm 23', () => {
    const meta = buildBiblePlanDayMetadata(
      'psalms-30-days',
      '30 Days in the Psalms',
      5,
      'Psalm 23 — The Lord is my Shepherd',
    )
    expect(meta.title).toBe('Day 5: Psalm 23 — The Lord is my Shepherd')
    expect(meta.title.length).toBeLessThanOrEqual(45)
  })

  it('emits canonical override that strips query params', () => {
    const meta = buildBiblePlanDayMetadata(
      'psalms-30-days',
      '30 Days in the Psalms',
      5,
      'Psalm 23',
    )
    expect(meta.canonical).toBe('/bible/plans/psalms-30-days/day/5')

    // Full resolution: feed the canonical override through buildCanonicalUrl
    // with a dirty query string to verify the composed behavior the page relies on.
    const resolved = buildCanonicalUrl(
      '/bible/plans/psalms-30-days/day/5',
      '?verse=3',
      meta.canonical,
    )
    expect(resolved).toBe('https://worshiproom.com/bible/plans/psalms-30-days/day/5')
    expect(resolved).not.toContain('?verse=')
  })

  it('emits BreadcrumbList JSON-LD with 4 ListItems', () => {
    const meta = buildBiblePlanDayMetadata(
      'psalms-30-days',
      '30 Days in the Psalms',
      5,
      'Psalm 23',
    )
    const jsonLd = meta.jsonLd as Record<string, unknown>
    expect(jsonLd['@type']).toBe('BreadcrumbList')
    const items = jsonLd.itemListElement as Array<Record<string, unknown>>
    expect(items).toHaveLength(4)
    expect(items[0].name).toBe('Bible')
    expect(items[1].name).toBe('Plans')
    expect(items[2].name).toBe('30 Days in the Psalms')
    expect(items[3].name).toBe('Day 5')
  })

  it('uses per-slug OG image', () => {
    const meta = buildBiblePlanDayMetadata(
      'psalms-30-days',
      '30 Days in the Psalms',
      5,
      'Psalm 23',
    )
    expect(meta.ogImage).toBe('/og/plans/psalms-30-days.png')
  })

  it('handles very long day titles by truncating within the title budget', () => {
    const longDayTitle = 'a'.repeat(200)
    const meta = buildBiblePlanDayMetadata(
      'psalms-30-days',
      '30 Days in the Psalms',
      30,
      longDayTitle,
    )
    expect(meta.title.length).toBeLessThanOrEqual(45)
    expect(meta.description.length).toBeLessThanOrEqual(160)
  })

  it('description includes plan title and day title', () => {
    const meta = buildBiblePlanDayMetadata(
      'john-story-of-jesus',
      'The Story of Jesus',
      1,
      'In the beginning was the Word',
    )
    expect(meta.description).toContain('The Story of Jesus')
    expect(meta.description).toContain('Day 1')
  })
})
