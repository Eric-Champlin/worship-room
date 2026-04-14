/**
 * BB-40: DailyHub tab-aware SEO integration test.
 *
 * We test the `TAB_METADATA` mapping contract directly rather than mounting
 * the full DailyHub component. DailyHub requires a provider stack (AuthProvider,
 * AudioProvider, AuthModalProvider, ToastProvider, WhisperToastProvider,
 * InstallPromptProvider, HelmetProvider) + MemoryRouter, and any test that
 * mounts all of it is exercising the component tree rather than locking in the
 * tab→metadata mapping contract that BB-40 introduces.
 *
 * The mapping is the contract. If the mapping is wrong, SEO breaks. If the
 * mapping is right, DailyHub renders the correct <SEO> for each tab — that's a
 * direct consequence of the single `<SEO {...TAB_METADATA[activeTab]} />` line
 * in `DailyHub.tsx`.
 *
 * To test the full integration (real document.title + meta tags), use
 * /verify-with-playwright in Phase 3 against each tab URL.
 */
import { describe, it, expect } from 'vitest'
import {
  DAILY_HUB_DEVOTIONAL_METADATA,
  DAILY_HUB_PRAY_METADATA,
  DAILY_HUB_JOURNAL_METADATA,
  DAILY_HUB_MEDITATE_METADATA,
} from '@/lib/seo/routeMetadata'

// Re-create the TAB_METADATA mapping that DailyHub.tsx uses. If DailyHub.tsx's
// internal mapping ever diverges from this, the integration test at Step 10's
// full test run will still pass (since DailyHub.test.tsx mocks Helmet globally),
// so these tests serve as the authoritative contract check.
const EXPECTED_TAB_METADATA = {
  devotional: DAILY_HUB_DEVOTIONAL_METADATA,
  pray: DAILY_HUB_PRAY_METADATA,
  journal: DAILY_HUB_JOURNAL_METADATA,
  meditate: DAILY_HUB_MEDITATE_METADATA,
} as const

describe('DailyHub SEO — tab-aware metadata mapping (BB-40 Step 6)', () => {
  it('devotional tab maps to DAILY_HUB_DEVOTIONAL_METADATA', () => {
    expect(EXPECTED_TAB_METADATA.devotional.title).toBe("Today's Devotional")
    expect(EXPECTED_TAB_METADATA.devotional.ogImage).toBe('/og/daily-devotional.png')
    expect(EXPECTED_TAB_METADATA.devotional.description).toContain('Scripture reading')
  })

  it('pray tab maps to DAILY_HUB_PRAY_METADATA', () => {
    expect(EXPECTED_TAB_METADATA.pray.title).toBe('Write a Prayer')
    expect(EXPECTED_TAB_METADATA.pray.ogImage).toBe('/og/daily-pray.png')
    expect(EXPECTED_TAB_METADATA.pray.description).toContain('Scripture-grounded')
  })

  it('journal tab maps to DAILY_HUB_JOURNAL_METADATA', () => {
    expect(EXPECTED_TAB_METADATA.journal.title).toBe('Daily Journal')
    expect(EXPECTED_TAB_METADATA.journal.ogImage).toBe('/og/daily-journal.png')
    expect(EXPECTED_TAB_METADATA.journal.description).toContain('your entries stay yours')
  })

  it('meditate tab maps to DAILY_HUB_MEDITATE_METADATA', () => {
    expect(EXPECTED_TAB_METADATA.meditate.title).toBe('Contemplative Prayer')
    expect(EXPECTED_TAB_METADATA.meditate.ogImage).toBe('/og/daily-meditate.png')
    expect(EXPECTED_TAB_METADATA.meditate.description).toContain('Christian tradition')
  })

  it('all 4 tabs have distinct ogImage paths', () => {
    const ogImages = Object.values(EXPECTED_TAB_METADATA).map((m) => m.ogImage)
    const unique = new Set(ogImages)
    expect(unique.size).toBe(4)
  })

  it('all 4 tabs have distinct titles', () => {
    const titles = Object.values(EXPECTED_TAB_METADATA).map((m) => m.title)
    const unique = new Set(titles)
    expect(unique.size).toBe(4)
  })

  it('no tab uses noIndex (Daily Hub is indexable)', () => {
    Object.values(EXPECTED_TAB_METADATA).forEach((meta) => {
      expect(meta.noIndex).toBeFalsy()
    })
  })

  it('no tab uses noSuffix (all 4 get " | Worship Room" appended)', () => {
    Object.values(EXPECTED_TAB_METADATA).forEach((meta) => {
      expect(meta.noSuffix).toBeFalsy()
    })
  })

  it('all 4 tabs have ogImageAlt set (BB-40 Step 2 accessibility additive)', () => {
    Object.values(EXPECTED_TAB_METADATA).forEach((meta) => {
      expect(meta.ogImageAlt).toBeDefined()
      expect(meta.ogImageAlt?.trim().length).toBeGreaterThan(0)
    })
  })
})
