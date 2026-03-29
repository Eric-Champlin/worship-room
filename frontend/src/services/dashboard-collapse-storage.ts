const COLLAPSE_KEY = 'wr_dashboard_collapsed'

export function getCollapseState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (_e) {
    // localStorage may be unavailable or data malformed
    return {}
  }
}

export function setCollapseState(id: string, collapsed: boolean): void {
  try {
    const state = getCollapseState()
    state[id] = collapsed
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify(state))
  } catch (_e) {
    // localStorage may be unavailable
  }
}

export function getInitialCollapsed(id: string, defaultCollapsed: boolean): boolean {
  const persisted = getCollapseState()
  if (id in persisted) return persisted[id]
  return defaultCollapsed
}
