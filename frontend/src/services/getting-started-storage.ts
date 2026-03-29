import type { GettingStartedData } from '@/types/dashboard'

const GETTING_STARTED_KEY = 'wr_getting_started'
const GETTING_STARTED_COMPLETE_KEY = 'wr_getting_started_complete'

export function freshGettingStartedData(): GettingStartedData {
  return {
    mood_done: false,
    pray_done: false,
    journal_done: false,
    meditate_done: false,
    ambient_visited: false,
    prayer_wall_visited: false,
  }
}

export function getGettingStartedData(): GettingStartedData {
  try {
    const raw = localStorage.getItem(GETTING_STARTED_KEY)
    if (!raw) return freshGettingStartedData()
    const parsed = JSON.parse(raw)
    return { ...freshGettingStartedData(), ...parsed }
  } catch (_e) {
    // localStorage may be unavailable or data malformed
    return freshGettingStartedData()
  }
}

export function setGettingStartedFlag(key: keyof GettingStartedData, value: boolean): void {
  try {
    const data = getGettingStartedData()
    data[key] = value
    localStorage.setItem(GETTING_STARTED_KEY, JSON.stringify(data))
  } catch (_e) {
    // localStorage may be unavailable
  }
}

export function isGettingStartedComplete(): boolean {
  try {
    return localStorage.getItem(GETTING_STARTED_COMPLETE_KEY) === 'true'
  } catch (_e) {
    // localStorage may be unavailable
    return false
  }
}

export function setGettingStartedComplete(): void {
  try {
    localStorage.setItem(GETTING_STARTED_COMPLETE_KEY, 'true')
  } catch (_e) {
    // localStorage may be unavailable
  }
}
