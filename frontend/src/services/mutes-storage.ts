import type { MutesData } from '@/types/dashboard'

export const MUTES_KEY = 'wr_mutes'

export const EMPTY_MUTES_DATA: MutesData = { muted: [] }

export function getMutesData(): MutesData {
  try {
    const raw = localStorage.getItem(MUTES_KEY)
    if (!raw) return EMPTY_MUTES_DATA
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.muted)) {
      return EMPTY_MUTES_DATA
    }
    return parsed as MutesData
  } catch (_e) {
    // Corrupted localStorage data — return empty defaults
    return EMPTY_MUTES_DATA
  }
}

export function saveMutesData(data: MutesData): boolean {
  try {
    localStorage.setItem(MUTES_KEY, JSON.stringify(data))
    return true
  } catch (_e) {
    // localStorage write failed (quota exceeded or unavailable)
    return false
  }
}

// --- Pure operation functions (take data in, return new data out) ---

export function muteUser(data: MutesData, userId: string): MutesData {
  return data.muted.includes(userId)
    ? data
    : { ...data, muted: [...data.muted, userId] }
}

export function unmuteUser(data: MutesData, userId: string): MutesData {
  return { ...data, muted: data.muted.filter((id) => id !== userId) }
}

export function isMuted(data: MutesData, userId: string): boolean {
  return data.muted.includes(userId)
}
