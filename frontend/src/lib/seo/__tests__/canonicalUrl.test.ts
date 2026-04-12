import { describe, it, expect, beforeAll } from 'vitest'

// Ensure VITE_SITE_URL matches the default used in the module before import,
// so tests are deterministic regardless of the ambient env.
beforeAll(() => {
  // NOTE: The module reads SITE_URL at eval time. The test setup.ts does not
  // set VITE_SITE_URL so the fallback 'https://worshiproom.com' is used, which
  // matches all assertions below.
})

import { buildCanonicalUrl, SITE_URL, UI_STATE_PARAMS } from '../canonicalUrl'

describe('canonicalUrl module', () => {
  describe('SITE_URL', () => {
    it('resolves to the fallback production URL when VITE_SITE_URL is unset', () => {
      expect(SITE_URL).toBe('https://worshiproom.com')
    })
  })

  describe('UI_STATE_PARAMS', () => {
    it('includes tab and the three Spec Z verse params', () => {
      expect(UI_STATE_PARAMS).toEqual(['tab', 'verseRef', 'verseText', 'verseTheme'])
    })

    it('does NOT include q, mode, verse, scroll-to, action, view, source, or day', () => {
      const params = UI_STATE_PARAMS as readonly string[]
      expect(params).not.toContain('q')
      expect(params).not.toContain('mode')
      expect(params).not.toContain('verse')
      expect(params).not.toContain('scroll-to')
      expect(params).not.toContain('action')
      expect(params).not.toContain('view')
      expect(params).not.toContain('source')
      expect(params).not.toContain('day')
    })
  })

  describe('buildCanonicalUrl — base behavior', () => {
    it('returns root URL for pathname "/"', () => {
      expect(buildCanonicalUrl('/', '')).toBe('https://worshiproom.com/')
    })

    it('returns base URL with pathname for simple routes', () => {
      expect(buildCanonicalUrl('/daily', '')).toBe('https://worshiproom.com/daily')
    })

    it('normalizes trailing slash on non-root paths', () => {
      expect(buildCanonicalUrl('/settings/', '')).toBe('https://worshiproom.com/settings')
    })

    it('handles empty pathname by falling back to root', () => {
      expect(buildCanonicalUrl('', '')).toBe('https://worshiproom.com/')
    })

    it('handles multiple trailing slashes', () => {
      expect(buildCanonicalUrl('/grow///', '')).toBe('https://worshiproom.com/grow')
    })
  })

  describe('buildCanonicalUrl — UI_STATE_PARAMS stripping', () => {
    it('strips ?tab=pray from /daily', () => {
      expect(buildCanonicalUrl('/daily', '?tab=pray')).toBe('https://worshiproom.com/daily')
    })

    it('strips all four Spec Z params from /daily?tab=meditate', () => {
      expect(
        buildCanonicalUrl(
          '/daily',
          '?tab=meditate&verseRef=John%204%3A14&verseText=Whoever&verseTheme=living-water',
        ),
      ).toBe('https://worshiproom.com/daily')
    })

    it('strips ?tab= but not ?day= from /daily', () => {
      expect(buildCanonicalUrl('/daily', '?tab=devotional&day=3')).toBe(
        'https://worshiproom.com/daily?day=3',
      )
    })

    it('strips ?tab= but preserves marketing ?source=', () => {
      expect(buildCanonicalUrl('/grow', '?tab=plans&source=email')).toBe(
        'https://worshiproom.com/grow?source=email',
      )
    })
  })

  describe('buildCanonicalUrl — content params preserved', () => {
    it('preserves ?mode=search&q=love on /bible', () => {
      expect(buildCanonicalUrl('/bible', '?mode=search&q=love')).toBe(
        'https://worshiproom.com/bible?mode=search&q=love',
      )
    })

    it('preserves ?q= on its own', () => {
      expect(buildCanonicalUrl('/bible', '?q=peace')).toBe(
        'https://worshiproom.com/bible?q=peace',
      )
    })
  })

  describe('buildCanonicalUrl — canonicalOverride behavior', () => {
    it('uses the override path and drops all query params for Bible chapter', () => {
      expect(
        buildCanonicalUrl(
          '/bible/genesis/1',
          '?verse=3&scroll-to=3&action=reflect',
          '/bible/genesis/1',
        ),
      ).toBe('https://worshiproom.com/bible/genesis/1')
    })

    it('uses the override path and drops ?verse= for plan day', () => {
      expect(
        buildCanonicalUrl(
          '/bible/plans/psalms-30-days/day/5',
          '?verse=3',
          '/bible/plans/psalms-30-days/day/5',
        ),
      ).toBe('https://worshiproom.com/bible/plans/psalms-30-days/day/5')
    })

    it('override path is used even when current pathname differs', () => {
      // Edge case: a route that internally redirects but wants a specific canonical
      expect(buildCanonicalUrl('/some/internal/path', '', '/bible/plans/psalms-30-days')).toBe(
        'https://worshiproom.com/bible/plans/psalms-30-days',
      )
    })

    it('override normalizes its own trailing slash', () => {
      expect(buildCanonicalUrl('/bible/genesis/1', '?verse=1', '/bible/genesis/1/')).toBe(
        'https://worshiproom.com/bible/genesis/1',
      )
    })
  })

  describe('buildCanonicalUrl — edge cases', () => {
    it('preserves search-mode identity when override is absent', () => {
      // Important: ?mode=search&q= must NOT be stripped because search is a
      // content identity, not UI state
      expect(buildCanonicalUrl('/bible', '?mode=search&q=love&source=email')).toBe(
        'https://worshiproom.com/bible?mode=search&q=love&source=email',
      )
    })

    it('handles query string with leading ? explicitly', () => {
      expect(buildCanonicalUrl('/daily', '?tab=pray')).toBe('https://worshiproom.com/daily')
    })

    it('handles query string without leading ?', () => {
      // URLSearchParams accepts both '?tab=pray' and 'tab=pray'
      expect(buildCanonicalUrl('/daily', 'tab=pray')).toBe('https://worshiproom.com/daily')
    })
  })
})
