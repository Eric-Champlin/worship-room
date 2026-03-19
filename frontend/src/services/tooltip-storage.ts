const TOOLTIPS_SEEN_KEY = 'wr_tooltips_seen'

export function getTooltipsSeen(): Record<string, true> {
  try {
    const raw = localStorage.getItem(TOOLTIPS_SEEN_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function isTooltipSeen(tooltipId: string): boolean {
  return !!getTooltipsSeen()[tooltipId]
}

export function markTooltipSeen(tooltipId: string): void {
  try {
    const current = getTooltipsSeen()
    current[tooltipId] = true
    localStorage.setItem(TOOLTIPS_SEEN_KEY, JSON.stringify(current))
  } catch {
    // localStorage unavailable — tooltip will show again next visit (acceptable for MVP)
  }
}
