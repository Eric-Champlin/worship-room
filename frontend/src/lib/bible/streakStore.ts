import { BIBLE_STREAK_KEY } from '@/constants/bible'
import type { StreakRecord, StreakUpdateResult } from '@/types/bible-streak'
import { STREAK_MILESTONES } from '@/types/bible-streak'
import { daysBetween, getISOWeekStart, getTodayLocal } from './dateUtils'

// --- Module-level state ---
let cache: StreakRecord | null = null
const listeners = new Set<() => void>()

// --- Default state ---
const DEFAULT_STREAK: StreakRecord = {
  currentStreak: 0,
  longestStreak: 0,
  lastReadDate: '',
  streakStartDate: '',
  graceDaysAvailable: 1,
  graceDaysUsedThisWeek: 0,
  lastGraceUsedDate: null,
  weekResetDate: '',
  milestones: [],
  totalDaysRead: 0,
}

// --- Storage I/O ---
function readFromStorage(): StreakRecord {
  if (typeof window === 'undefined') return { ...DEFAULT_STREAK }

  try {
    const raw = localStorage.getItem(BIBLE_STREAK_KEY)
    if (raw) {
      return JSON.parse(raw) as StreakRecord
    }

    // Migration from old wr_bible_streak key
    const oldRaw = localStorage.getItem('wr_bible_streak')
    if (oldRaw) {
      const old = JSON.parse(oldRaw) as { count: number; lastReadDate: string }
      const migrated: StreakRecord = {
        ...DEFAULT_STREAK,
        currentStreak: old.count,
        longestStreak: old.count,
        lastReadDate: old.lastReadDate,
        streakStartDate: '', // unknown — accept data loss
        totalDaysRead: old.count, // best estimate
      }
      writeToStorage(migrated)
      return migrated
    }

    return { ...DEFAULT_STREAK }
  } catch {
    return { ...DEFAULT_STREAK }
  }
}

function writeToStorage(data: StreakRecord): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(BIBLE_STREAK_KEY, JSON.stringify(data))
  } catch {
    // Silent fail — localStorage unavailable or quota exceeded
  }
}

function getCache(): StreakRecord {
  if (cache === null) {
    cache = readFromStorage()
  }
  return cache
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener()
  }
}

// --- Read API ---
export function getStreak(): StreakRecord {
  return { ...getCache() }
}

// --- Write API ---
export function recordReadToday(): StreakUpdateResult {
  const today = getTodayLocal()
  const record = { ...getCache(), milestones: [...getCache().milestones] }
  const previousStreak = record.currentStreak
  const isFirstReadEver = record.lastReadDate === ''

  // Reset weekly grace if we've crossed into a new ISO week
  const currentWeekStart = getISOWeekStart(today)
  if (record.weekResetDate !== currentWeekStart) {
    record.weekResetDate = currentWeekStart
    record.graceDaysUsedThisWeek = 0
    record.graceDaysAvailable = 1
  }

  // Case A: already read today
  if (today === record.lastReadDate) {
    return {
      previousStreak,
      newStreak: record.currentStreak,
      delta: 'same-day',
      milestoneReached: null,
      graceDaysRemaining: record.graceDaysAvailable - record.graceDaysUsedThisWeek,
      isFirstReadEver: false,
    }
  }

  let delta: StreakUpdateResult['delta']

  if (isFirstReadEver) {
    // Case B: first read ever
    record.currentStreak = 1
    record.streakStartDate = today
    record.totalDaysRead = 1
    delta = 'first-read'
  } else {
    const gap = daysBetween(record.lastReadDate, today)

    if (gap === 1) {
      // Case C: consecutive day
      record.currentStreak += 1
      record.totalDaysRead += 1
      delta = 'extended'
    } else if (gap === 2 && record.graceDaysUsedThisWeek === 0 && record.graceDaysAvailable >= 1) {
      // Case D: 2-day gap with grace available
      record.currentStreak += 1
      record.totalDaysRead += 1
      record.graceDaysUsedThisWeek = 1
      record.lastGraceUsedDate = today
      delta = 'used-grace'
    } else {
      // Case D (no grace) or Case E: reset
      record.currentStreak = 1
      record.streakStartDate = today
      record.totalDaysRead += 1
      delta = 'reset'
    }
  }

  record.lastReadDate = today
  record.longestStreak = Math.max(record.longestStreak, record.currentStreak)

  // Milestone check
  let milestoneReached: number | null = null
  for (const m of STREAK_MILESTONES) {
    if (record.currentStreak === m && !record.milestones.includes(m)) {
      record.milestones.push(m)
      milestoneReached = m
      break
    }
  }

  cache = record
  writeToStorage(record)
  notifyListeners()

  return {
    previousStreak,
    newStreak: record.currentStreak,
    delta,
    milestoneReached,
    graceDaysRemaining: record.graceDaysAvailable - record.graceDaysUsedThisWeek,
    isFirstReadEver,
  }
}

// --- Subscription ---
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// --- Test helper ---
export function _resetForTesting(): void {
  cache = null
}
