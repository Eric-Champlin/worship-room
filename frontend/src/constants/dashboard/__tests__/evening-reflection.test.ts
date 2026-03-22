import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  EVENING_PRAYERS,
  EVENING_VERSES,
  EVENING_HOUR_THRESHOLD,
  EVENING_REFLECTION_STORAGE_KEY,
  getEveningPrayer,
  getEveningVerse,
} from '../evening-reflection';

afterEach(() => {
  vi.useRealTimers();
});

describe('EVENING_PRAYERS', () => {
  it('has 7 prayers (one per day of week)', () => {
    expect(EVENING_PRAYERS).toHaveLength(7);
  });

  it('covers all 7 days (0-6)', () => {
    const days = EVENING_PRAYERS.map((p) => p.dayOfWeek).sort();
    expect(days).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('each prayer has non-empty text', () => {
    for (const prayer of EVENING_PRAYERS) {
      expect(prayer.text.length).toBeGreaterThan(20);
    }
  });
});

describe('EVENING_VERSES', () => {
  it('has 7 verses (one per day of week)', () => {
    expect(EVENING_VERSES).toHaveLength(7);
  });

  it('covers all 7 days (0-6)', () => {
    const days = EVENING_VERSES.map((v) => v.dayOfWeek).sort();
    expect(days).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('each verse has text and reference', () => {
    for (const verse of EVENING_VERSES) {
      expect(verse.text.length).toBeGreaterThan(10);
      expect(verse.reference.length).toBeGreaterThan(3);
    }
  });
});

describe('getEveningPrayer', () => {
  it('returns the correct prayer for each day of the week', () => {
    for (let day = 0; day <= 6; day++) {
      vi.useFakeTimers();
      // Set to a date with the given day of week
      // March 22, 2026 is a Sunday (day 0)
      const date = new Date(2026, 2, 22 + day, 20, 0, 0);
      vi.setSystemTime(date);
      const prayer = getEveningPrayer();
      expect(prayer.dayOfWeek).toBe(date.getDay());
      expect(prayer.text).toBe(EVENING_PRAYERS[date.getDay()].text);
      vi.useRealTimers();
    }
  });
});

describe('getEveningVerse', () => {
  it('returns the correct verse for each day of the week', () => {
    for (let day = 0; day <= 6; day++) {
      vi.useFakeTimers();
      const date = new Date(2026, 2, 22 + day, 20, 0, 0);
      vi.setSystemTime(date);
      const verse = getEveningVerse();
      expect(verse.dayOfWeek).toBe(date.getDay());
      expect(verse.text).toBe(EVENING_VERSES[date.getDay()].text);
      expect(verse.reference).toBe(EVENING_VERSES[date.getDay()].reference);
      vi.useRealTimers();
    }
  });
});

describe('constants', () => {
  it('EVENING_HOUR_THRESHOLD is 18', () => {
    expect(EVENING_HOUR_THRESHOLD).toBe(18);
  });

  it('EVENING_REFLECTION_STORAGE_KEY is correct', () => {
    expect(EVENING_REFLECTION_STORAGE_KEY).toBe('wr_evening_reflection');
  });
});
