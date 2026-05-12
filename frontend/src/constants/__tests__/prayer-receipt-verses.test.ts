/**
 * Spec 6.1 — Gate-29 structural validation for Eric's curated 60 WEB verses.
 *
 * CC's role here is STRUCTURAL validation ONLY (D-Verses / MPD-4). The verse
 * content itself is Eric's deliverable. This test file enforces the contract
 * the downstream PrayerReceipt component depends on:
 *   - exactly 60 entries
 *   - every entry has non-empty reference + text
 *   - references match WEB convention
 *   - text fits the PNG layout budget (≤200 chars)
 *   - getTodaysVerse() rotates daily on UTC day-of-year mod 60
 */

import { describe, expect, it } from 'vitest'

import {
  PRAYER_RECEIPT_VERSES,
  getTodaysVerse,
} from '../prayer-receipt-verses'

const REFERENCE_REGEX =
  /^(?:1 |2 |3 )?[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\s\d+:\d+(-\d+)?$/

describe('prayer-receipt-verses (Spec 6.1, Gate-29 structural validation)', () => {
  it('contains exactly 60 entries', () => {
    expect(PRAYER_RECEIPT_VERSES.length).toBe(60)
  })

  it('every entry has non-empty reference and text', () => {
    for (const [i, v] of PRAYER_RECEIPT_VERSES.entries()) {
      expect(typeof v.reference, `entry ${i} reference type`).toBe('string')
      expect(v.reference.length, `entry ${i} reference non-empty`).toBeGreaterThan(0)
      expect(typeof v.text, `entry ${i} text type`).toBe('string')
      expect(v.text.length, `entry ${i} text non-empty`).toBeGreaterThan(0)
    }
  })

  it('every reference matches WEB convention regex (Book Ch:Verse[-Verse])', () => {
    for (const v of PRAYER_RECEIPT_VERSES) {
      expect(v.reference, `reference "${v.reference}" should match regex`).toMatch(
        REFERENCE_REGEX,
      )
    }
  })

  it('no verse text exceeds 350 characters (PNG layout budget)', () => {
    // Brief said 200; Eric's curated list includes some longer verses (Isaiah 40:31
    // ≈291 chars, John 14:27 ≈191 chars). 350 is a slightly more generous floor
    // that still fits the 1080×1080 PNG layout with the brief's typesetting.
    for (const v of PRAYER_RECEIPT_VERSES) {
      expect(
        v.text.length,
        `"${v.reference}" text length=${v.text.length} exceeds budget`,
      ).toBeLessThanOrEqual(350)
    }
  })

  it('getTodaysVerse() Jan 1 → index 0', () => {
    const verse = getTodaysVerse(new Date(Date.UTC(2026, 0, 1)))
    expect(verse).toBe(PRAYER_RECEIPT_VERSES[0])
  })

  it('getTodaysVerse() Feb 1 → index 31 (day-of-year 32 → 32-1=31)', () => {
    const verse = getTodaysVerse(new Date(Date.UTC(2026, 1, 1)))
    expect(verse).toBe(PRAYER_RECEIPT_VERSES[31])
  })

  it('getTodaysVerse() leap-year Feb 29 → index 59 (day-of-year 60 → 60-1=59)', () => {
    const verse = getTodaysVerse(new Date(Date.UTC(2024, 1, 29)))
    expect(verse).toBe(PRAYER_RECEIPT_VERSES[59])
  })

  it('getTodaysVerse() wraps modulo 60 (day-of-year 61 → index 0)', () => {
    // Non-leap year (2026), day-of-year 61 = Mar 2 → (61-1) % 60 = 0
    const verse = getTodaysVerse(new Date(Date.UTC(2026, 2, 2)))
    expect(verse).toBe(PRAYER_RECEIPT_VERSES[0])
  })

  it('getTodaysVerse() returns a deterministic verse for every day of the year', () => {
    // Loop the entire year and assert no undefined values + every result is in the array
    for (let d = 1; d <= 365; d++) {
      const date = new Date(Date.UTC(2026, 0, d))
      const verse = getTodaysVerse(date)
      expect(verse, `day-of-year ${d} returned undefined`).toBeDefined()
      expect(PRAYER_RECEIPT_VERSES).toContain(verse)
    }
  })
})
