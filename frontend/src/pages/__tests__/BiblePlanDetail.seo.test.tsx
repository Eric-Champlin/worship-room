/**
 * BB-40 Step 8: BiblePlanDetail SEO integration test.
 *
 * Tests the `buildBiblePlanMetadata` contract the page uses, rather than
 * mounting the full page which requires `usePlan` hook stubbing and the
 * AuthModalProvider stack. The page wires the builder inline via
 * `<SEO {...buildBiblePlanMetadata(plan.slug, plan.title, plan.description)} />`,
 * so locking in the builder output locks in the page's SEO behavior.
 *
 * The noIndex error branch is tested at the SEO.test.tsx level (noIndex prop
 * emits the correct meta tag). Here we verify the builder's output shape for
 * the 4 real plan slugs.
 */
import { describe, it, expect } from 'vitest'
import { buildBiblePlanMetadata } from '@/lib/seo/routeMetadata'

// Real values from frontend/src/data/bible/plans/manifest.json
const REAL_PLANS = [
  {
    slug: 'psalms-30-days',
    title: '30 Days in the Psalms',
    description:
      'The Psalms are the prayer book of the Bible. For three thousand years, people have turned to these poems when they needed language for what they were feeling — grief, joy, rage, wonder, loneliness, hope.',
  },
  {
    slug: 'john-story-of-jesus',
    title: 'The Story of Jesus',
    description:
      'John was the last of the four Gospels written. By the time John picked up his pen, three other accounts of Jesus\'s life were already in circulation.',
  },
  {
    slug: 'when-youre-anxious',
    title: "When You're Anxious",
    description:
      "If you're reading this, you might already know the verses. Be anxious for nothing. Do not fear.",
  },
  {
    slug: 'when-you-cant-sleep',
    title: "When You Can't Sleep",
    description:
      "If you're reading this, it's probably late. Or early — the kind of early that doesn't feel like morning yet.",
  },
]

describe('BiblePlanDetail SEO — buildBiblePlanMetadata contract (BB-40 Step 8)', () => {
  REAL_PLANS.forEach((plan) => {
    it(`${plan.slug}: produces canonical /bible/plans/${plan.slug}`, () => {
      const meta = buildBiblePlanMetadata(plan.slug, plan.title, plan.description)
      expect(meta.canonical).toBe(`/bible/plans/${plan.slug}`)
    })

    it(`${plan.slug}: uses per-slug OG image`, () => {
      const meta = buildBiblePlanMetadata(plan.slug, plan.title, plan.description)
      expect(meta.ogImage).toBe(`/og/plans/${plan.slug}.png`)
    })

    it(`${plan.slug}: emits BreadcrumbList JSON-LD with 3 ListItems`, () => {
      const meta = buildBiblePlanMetadata(plan.slug, plan.title, plan.description)
      const jsonLd = meta.jsonLd as Record<string, unknown>
      expect(jsonLd['@type']).toBe('BreadcrumbList')
      const items = jsonLd.itemListElement as Array<Record<string, unknown>>
      expect(items).toHaveLength(3)
      expect(items[0].name).toBe('Bible')
      expect(items[1].name).toBe('Plans')
      expect(items[2].name).toBe(plan.title)
    })

    it(`${plan.slug}: title fits in the 45-char suffixed-title budget`, () => {
      const meta = buildBiblePlanMetadata(plan.slug, plan.title, plan.description)
      expect(meta.title.length).toBeLessThanOrEqual(45)
    })

    it(`${plan.slug}: description fits in the 160-char limit`, () => {
      const meta = buildBiblePlanMetadata(plan.slug, plan.title, plan.description)
      expect(meta.description.length).toBeLessThanOrEqual(160)
    })
  })

  it('falls back to /og/bible-chapter.png for unknown slugs', () => {
    const meta = buildBiblePlanMetadata('custom-plan-slug', 'A Custom Plan', 'desc')
    expect(meta.ogImage).toBe('/og/bible-chapter.png')
  })
})
