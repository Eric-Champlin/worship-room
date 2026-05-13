import { describe, it, expect } from 'vitest'
import {
  WATCH_CRISIS_BANNER_COPY,
  WATCH_OPT_IN_MODAL_COPY,
  WATCH_SETTINGS_COPY,
  WATCH_INDICATOR_COPY,
  WATCH_COMPOSER_PLACEHOLDER,
} from '../watch-copy'

describe('watch-copy constants (Spec 6.4)', () => {
  it('exports five non-empty copy decks', () => {
    expect(WATCH_CRISIS_BANNER_COPY.heading.length).toBeGreaterThan(0)
    expect(WATCH_OPT_IN_MODAL_COPY.header.length).toBeGreaterThan(0)
    expect(WATCH_SETTINGS_COPY.sectionHeading.length).toBeGreaterThan(0)
    expect(WATCH_INDICATOR_COPY.chipText.length).toBeGreaterThan(0)
    expect(WATCH_COMPOSER_PLACEHOLDER.length).toBeGreaterThan(0)
    expect(WATCH_SETTINGS_COPY.options).toHaveLength(3)
  })

  it('contains zero exclamation points (Gate-G-COPY anti-pressure rule)', () => {
    const allStrings: string[] = [
      WATCH_CRISIS_BANNER_COPY.heading,
      WATCH_CRISIS_BANNER_COPY.body,
      WATCH_CRISIS_BANNER_COPY.phoneLinkText,
      WATCH_CRISIS_BANNER_COPY.phoneLinkAriaLabel,
      WATCH_CRISIS_BANNER_COPY.chatLinkText,
      WATCH_CRISIS_BANNER_COPY.chatLinkAriaLabel,
      WATCH_OPT_IN_MODAL_COPY.header,
      WATCH_OPT_IN_MODAL_COPY.body,
      WATCH_OPT_IN_MODAL_COPY.primaryActionLabel,
      WATCH_OPT_IN_MODAL_COPY.secondaryActionLabel,
      WATCH_SETTINGS_COPY.sectionHeading,
      WATCH_SETTINGS_COPY.sectionHelper,
      WATCH_SETTINGS_COPY.toggleLabel,
      WATCH_SETTINGS_COPY.toggleDescription,
      ...WATCH_SETTINGS_COPY.options.flatMap((o) => [o.label, o.description]),
      WATCH_INDICATOR_COPY.chipText,
      WATCH_INDICATOR_COPY.chipAriaLabel,
      WATCH_COMPOSER_PLACEHOLDER,
    ]
    for (const s of allStrings) {
      expect(s).not.toContain('!')
    }
  })
})
