import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getLocalDateString } from '@/utils/date';
import {
  getVisits,
  getVisitsByPlace,
  getVisitsByDate,
  hasVisitedToday,
  addVisit,
  updateVisitNote,
  removeVisit,
  getUniqueVisitedPlaces,
  categoryToPlaceType,
  STORAGE_KEY,
  MAX_ENTRIES,
} from '../local-visit-storage';

beforeEach(() => {
  localStorage.clear();
});

describe('getVisits', () => {
  it('returns empty array on fresh start', () => {
    expect(getVisits()).toEqual([]);
  });

  it('handles corrupted JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not-valid-json!!!');
    expect(getVisits()).toEqual([]);
  });

  it('returns empty array when stored value is not an array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    expect(getVisits()).toEqual([]);
  });
});

describe('addVisit', () => {
  it('creates entry with UUID', () => {
    const visit = addVisit({
      placeId: 'place-1',
      placeName: 'Grace Church',
      placeType: 'church',
      visitDate: '2026-03-24',
      note: '',
    });

    expect(visit.id).toBeDefined();
    expect(typeof visit.id).toBe('string');
    expect(visit.id.length).toBeGreaterThan(0);
    expect(visit.placeId).toBe('place-1');
    expect(visit.placeName).toBe('Grace Church');

    const stored = getVisits();
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(visit.id);
  });

  it('prepends new visits', () => {
    addVisit({
      placeId: 'place-1',
      placeName: 'First Church',
      placeType: 'church',
      visitDate: '2026-03-20',
      note: '',
    });
    addVisit({
      placeId: 'place-2',
      placeName: 'Second Church',
      placeType: 'church',
      visitDate: '2026-03-21',
      note: '',
    });

    const stored = getVisits();
    expect(stored[0].placeName).toBe('Second Church');
    expect(stored[1].placeName).toBe('First Church');
  });

  it('prunes when exceeding MAX_ENTRIES', () => {
    // Seed with MAX_ENTRIES visits
    const seed = Array.from({ length: MAX_ENTRIES }, (_, i) => ({
      id: `id-${i}`,
      placeId: `place-${i}`,
      placeName: `Place ${i}`,
      placeType: 'church' as const,
      visitDate: '2026-01-01',
      note: '',
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));

    // Adding one more should keep length at MAX_ENTRIES
    addVisit({
      placeId: 'new-place',
      placeName: 'New Place',
      placeType: 'counselor',
      visitDate: '2026-03-24',
      note: '',
    });

    const stored = getVisits();
    expect(stored).toHaveLength(MAX_ENTRIES);
    expect(stored[0].placeId).toBe('new-place');
  });
});

describe('hasVisitedToday', () => {
  it('returns true after visit today', () => {
    const today = getLocalDateString();
    addVisit({
      placeId: 'place-1',
      placeName: 'Grace Church',
      placeType: 'church',
      visitDate: today,
      note: '',
    });

    expect(hasVisitedToday('place-1')).toBe(true);
  });

  it('returns false for a different place', () => {
    const today = getLocalDateString();
    addVisit({
      placeId: 'place-1',
      placeName: 'Grace Church',
      placeType: 'church',
      visitDate: today,
      note: '',
    });

    expect(hasVisitedToday('place-2')).toBe(false);
  });

  it('returns false when visit was on a different day', () => {
    addVisit({
      placeId: 'place-1',
      placeName: 'Grace Church',
      placeType: 'church',
      visitDate: '2020-01-01',
      note: '',
    });

    expect(hasVisitedToday('place-1')).toBe(false);
  });
});

describe('getVisitsByPlace', () => {
  it('filters visits by placeId', () => {
    addVisit({ placeId: 'a', placeName: 'A', placeType: 'church', visitDate: '2026-03-20', note: '' });
    addVisit({ placeId: 'b', placeName: 'B', placeType: 'counselor', visitDate: '2026-03-21', note: '' });
    addVisit({ placeId: 'a', placeName: 'A', placeType: 'church', visitDate: '2026-03-22', note: '' });

    expect(getVisitsByPlace('a')).toHaveLength(2);
    expect(getVisitsByPlace('b')).toHaveLength(1);
    expect(getVisitsByPlace('c')).toHaveLength(0);
  });
});

describe('getVisitsByDate', () => {
  it('filters visits by date', () => {
    addVisit({ placeId: 'a', placeName: 'A', placeType: 'church', visitDate: '2026-03-20', note: '' });
    addVisit({ placeId: 'b', placeName: 'B', placeType: 'counselor', visitDate: '2026-03-21', note: '' });

    expect(getVisitsByDate('2026-03-20')).toHaveLength(1);
    expect(getVisitsByDate('2026-03-21')).toHaveLength(1);
    expect(getVisitsByDate('2026-03-22')).toHaveLength(0);
  });
});

describe('updateVisitNote', () => {
  it('saves note on existing visit', () => {
    const visit = addVisit({
      placeId: 'place-1',
      placeName: 'Grace Church',
      placeType: 'church',
      visitDate: '2026-03-24',
      note: '',
    });

    updateVisitNote(visit.id, 'Great service today');

    const stored = getVisits();
    expect(stored[0].note).toBe('Great service today');
  });

  it('truncates note to 300 characters', () => {
    const visit = addVisit({
      placeId: 'place-1',
      placeName: 'Grace Church',
      placeType: 'church',
      visitDate: '2026-03-24',
      note: '',
    });

    const longNote = 'a'.repeat(500);
    updateVisitNote(visit.id, longNote);

    const stored = getVisits();
    expect(stored[0].note).toHaveLength(300);
  });

  it('does nothing for non-existent visitId', () => {
    addVisit({
      placeId: 'place-1',
      placeName: 'Grace Church',
      placeType: 'church',
      visitDate: '2026-03-24',
      note: 'original',
    });

    updateVisitNote('non-existent-id', 'new note');

    const stored = getVisits();
    expect(stored[0].note).toBe('original');
  });
});

describe('removeVisit', () => {
  it('removes a visit by id', () => {
    const v1 = addVisit({ placeId: 'a', placeName: 'A', placeType: 'church', visitDate: '2026-03-20', note: '' });
    addVisit({ placeId: 'b', placeName: 'B', placeType: 'counselor', visitDate: '2026-03-21', note: '' });

    removeVisit(v1.id);

    const stored = getVisits();
    expect(stored).toHaveLength(1);
    expect(stored[0].placeId).toBe('b');
  });
});

describe('getUniqueVisitedPlaces', () => {
  it('counts unique places correctly', () => {
    addVisit({ placeId: 'c1', placeName: 'Church 1', placeType: 'church', visitDate: '2026-03-20', note: '' });
    addVisit({ placeId: 'c1', placeName: 'Church 1', placeType: 'church', visitDate: '2026-03-21', note: '' });
    addVisit({ placeId: 'c2', placeName: 'Church 2', placeType: 'church', visitDate: '2026-03-20', note: '' });
    addVisit({ placeId: 'co1', placeName: 'Counselor 1', placeType: 'counselor', visitDate: '2026-03-20', note: '' });
    addVisit({ placeId: 'cr1', placeName: 'CR 1', placeType: 'cr', visitDate: '2026-03-20', note: '' });
    addVisit({ placeId: 'cr1', placeName: 'CR 1', placeType: 'cr', visitDate: '2026-03-22', note: '' });

    const result = getUniqueVisitedPlaces();
    expect(result.total).toBe(4);
    expect(result.churches).toBe(2);
    expect(result.counselors).toBe(1);
    expect(result.cr).toBe(1);
  });

  it('returns zeros when no visits', () => {
    const result = getUniqueVisitedPlaces();
    expect(result).toEqual({ total: 0, churches: 0, counselors: 0, cr: 0 });
  });
});

describe('categoryToPlaceType', () => {
  it('maps churches to church', () => {
    expect(categoryToPlaceType('churches')).toBe('church');
  });

  it('maps counselors to counselor', () => {
    expect(categoryToPlaceType('counselors')).toBe('counselor');
  });

  it('maps celebrate-recovery to cr', () => {
    expect(categoryToPlaceType('celebrate-recovery')).toBe('cr');
  });
});
