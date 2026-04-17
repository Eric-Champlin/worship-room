/**
 * BB-40 Step 9: BibleReader BreadcrumbList JSON-LD verification.
 *
 * The BibleReader page now renders `<SEO {...buildBibleChapterMetadata(...)} />`
 * (migrated in Step 5). `buildBibleChapterMetadata` returns a 4-item
 * BreadcrumbList JSON-LD object, which `<SEO>` renders as a
 * `<script type="application/ld+json">` tag inside `<Helmet>`.
 *
 * Same narrow-contract test pattern as DailyHub.seo and BiblePlanDetail.seo —
 * mounting the full BibleReader page requires the BibleDrawerProvider,
 * TypographySheet, SwipeHandler, BookLoader, and a data hook stub. The
 * builder contract is the single point of truth that drives the JSON-LD
 * rendering, so locking in its output is sufficient for BB-40's "verify the
 * BibleReader JSON-LD is present" guarantee.
 *
 * Integration-level verification (that react-helmet-async actually renders
 * the `<script>` into `document.head`) is covered implicitly by SEO.test.tsx
 * test "renders JSON-LD script tag", which uses real Helmet and asserts the
 * exact emission path BB-40 relies on.
 */
import { describe, it, expect } from 'vitest'
import { buildBibleChapterMetadata } from '@/lib/seo/routeMetadata'

describe('BibleReader SEO — BreadcrumbList JSON-LD (BB-40 Step 9)', () => {
  it('emits a BreadcrumbList JSON-LD object for Philippians 4', () => {
    const meta = buildBibleChapterMetadata('Philippians', 4, 'philippians')
    expect(meta.jsonLd).toBeDefined()

    const jsonLd = meta.jsonLd as Record<string, unknown>
    expect(jsonLd['@context']).toBe('https://schema.org')
    expect(jsonLd['@type']).toBe('BreadcrumbList')
  })

  it('BreadcrumbList contains exactly 4 items with correct positions', () => {
    const meta = buildBibleChapterMetadata('Philippians', 4, 'philippians')
    const jsonLd = meta.jsonLd as Record<string, unknown>
    const items = jsonLd.itemListElement as Array<Record<string, unknown>>
    expect(items).toHaveLength(4)

    // Positions ascend from 1
    expect(items[0].position).toBe(1)
    expect(items[1].position).toBe(2)
    expect(items[2].position).toBe(3)
    expect(items[3].position).toBe(4)

    // All items are ListItem type
    items.forEach((item) => {
      expect(item['@type']).toBe('ListItem')
    })
  })

  it('BreadcrumbList items have correct names and URLs', () => {
    const meta = buildBibleChapterMetadata('Philippians', 4, 'philippians')
    const jsonLd = meta.jsonLd as Record<string, unknown>
    const items = jsonLd.itemListElement as Array<Record<string, unknown>>

    expect(items[0].name).toBe('Worship Room')
    expect(items[0].item).toBe('https://worshiproom.com/')

    expect(items[1].name).toBe('Study Bible')
    expect(items[1].item).toBe('https://worshiproom.com/bible')

    expect(items[2].name).toBe('Philippians')
    expect(items[2].item).toBe('https://worshiproom.com/bible/browse')

    expect(items[3].name).toBe('Philippians 4')
    expect(items[3].item).toBe('https://worshiproom.com/bible/philippians/4')
  })

  it('canonical override collapses ?verse= / ?scroll-to= / ?action= to clean path', () => {
    const meta = buildBibleChapterMetadata('Genesis', 1, 'genesis')
    expect(meta.canonical).toBe('/bible/genesis/1')
    // The canonical override means `<SEO>` will skip query-param pass-through
    // entirely — verified in canonicalUrl.test.ts "canonicalOverride" suite.
  })

  it('works for longest book name (Song of Solomon)', () => {
    const meta = buildBibleChapterMetadata('Song of Solomon', 8, 'song-of-solomon')
    const jsonLd = meta.jsonLd as Record<string, unknown>
    const items = jsonLd.itemListElement as Array<Record<string, unknown>>
    expect(items[2].name).toBe('Song of Solomon')
    expect(items[3].name).toBe('Song of Solomon 8')
    expect(items[3].item).toBe('https://worshiproom.com/bible/song-of-solomon/8')
  })

  it('ogImage is the shared bible-chapter card', () => {
    const meta = buildBibleChapterMetadata('Romans', 8, 'romans')
    expect(meta.ogImage).toBe('/og/bible-chapter.png')
  })

  it('ogImageAlt references the specific book and chapter', () => {
    const meta = buildBibleChapterMetadata('Romans', 8, 'romans')
    expect(meta.ogImageAlt).toBe('Romans 8 — World English Bible')
  })
})
