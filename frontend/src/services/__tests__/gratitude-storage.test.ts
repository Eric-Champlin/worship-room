import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getGratitudeEntries,
  getTodayGratitude,
  saveGratitudeEntry,
  getGratitudeStreak,
} from '../gratitude-storage';
import type { GratitudeEntry } from '../gratitude-storage';
import { getLocalDateString } from '@/utils/date';

const STORAGE_KEY = 'wr_gratitude_entries';

function makeDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return getLocalDateString(d);
}

function makeEntry(overrides: Partial<GratitudeEntry> = {}): GratitudeEntry {
  return {
    id: crypto.randomUUID(),
    date: getLocalDateString(),
    items: ['Item 1', 'Item 2'],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('gratitude-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getGratitudeEntries', () => {
    it('returns empty array when no key exists', () => {
      expect(getGratitudeEntries()).toEqual([]);
    });

    it('returns empty array for corrupted JSON', () => {
      localStorage.setItem(STORAGE_KEY, '{not valid json');
      expect(getGratitudeEntries()).toEqual([]);
    });

    it('returns empty array for non-array value', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
      expect(getGratitudeEntries()).toEqual([]);
    });

    it('returns stored entries', () => {
      const entries = [makeEntry(), makeEntry({ date: makeDateString(1) })];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      expect(getGratitudeEntries()).toEqual(entries);
    });
  });

  describe('getTodayGratitude', () => {
    it('returns null when no entry matches today', () => {
      const yesterday = makeEntry({ date: makeDateString(1) });
      localStorage.setItem(STORAGE_KEY, JSON.stringify([yesterday]));
      expect(getTodayGratitude()).toBeNull();
    });

    it('returns the matching entry for today', () => {
      const today = makeEntry({ date: getLocalDateString() });
      localStorage.setItem(STORAGE_KEY, JSON.stringify([today]));
      expect(getTodayGratitude()).toEqual(today);
    });
  });

  describe('saveGratitudeEntry', () => {
    it('saves a new entry with UUID and today date', () => {
      const entry = saveGratitudeEntry(['Thanks for sunshine', 'Good coffee', '']);
      expect(entry.id).toBeTruthy();
      expect(entry.date).toBe(getLocalDateString());
      expect(entry.items).toEqual(['Thanks for sunshine', 'Good coffee']);
      expect(entry.createdAt).toBeTruthy();

      const stored = getGratitudeEntries();
      expect(stored).toHaveLength(1);
      expect(stored[0]).toEqual(entry);
    });

    it('filters empty items and trims whitespace', () => {
      const entry = saveGratitudeEntry(['  padded  ', '', '   ']);
      expect(entry.items).toEqual(['padded']);
    });

    it('truncates items longer than 150 characters', () => {
      const longString = 'a'.repeat(200);
      const entry = saveGratitudeEntry([longString]);
      expect(entry.items[0]).toHaveLength(150);
    });

    it('updates existing entry for same day and preserves original ID', () => {
      const first = saveGratitudeEntry(['First item']);
      const originalId = first.id;

      const second = saveGratitudeEntry(['Updated item', 'New item']);
      expect(second.id).toBe(originalId);
      expect(second.items).toEqual(['Updated item', 'New item']);

      const stored = getGratitudeEntries();
      expect(stored).toHaveLength(1);
    });

    it('caps at 365 entries by removing oldest', () => {
      // Seed 365 entries
      const entries: GratitudeEntry[] = [];
      for (let i = 0; i < 365; i++) {
        entries.push(makeEntry({ date: makeDateString(i + 1) }));
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));

      // Save a new entry for today (should push total to 366, then prune to 365)
      saveGratitudeEntry(['New entry']);

      const stored = getGratitudeEntries();
      expect(stored).toHaveLength(365);
      // First entry should be today's new entry
      expect(stored[0].items).toEqual(['New entry']);
    });
  });

  describe('getGratitudeStreak', () => {
    it('returns 0 when no entries exist', () => {
      expect(getGratitudeStreak()).toBe(0);
    });

    it('returns 1 for a single entry today', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([makeEntry({ date: makeDateString(0) })]),
      );
      expect(getGratitudeStreak()).toBe(1);
    });

    it('counts consecutive days correctly', () => {
      const entries = [
        makeEntry({ date: makeDateString(0) }),
        makeEntry({ date: makeDateString(1) }),
        makeEntry({ date: makeDateString(2) }),
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      expect(getGratitudeStreak()).toBe(3);
    });

    it('stops counting at a gap', () => {
      const entries = [
        makeEntry({ date: makeDateString(0) }),
        makeEntry({ date: makeDateString(1) }),
        // day 2 missing
        makeEntry({ date: makeDateString(3) }),
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      expect(getGratitudeStreak()).toBe(2);
    });

    it('returns 0 when no entry for today or yesterday', () => {
      const entries = [makeEntry({ date: makeDateString(3) })];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      expect(getGratitudeStreak()).toBe(0);
    });
  });
});
