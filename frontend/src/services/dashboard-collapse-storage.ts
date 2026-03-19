const COLLAPSE_KEY = 'wr_dashboard_collapsed'

export function getCollapseState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function setCollapseState(id: string, collapsed: boolean): void {
  try {
    const state = getCollapseState()
    state[id] = collapsed
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify(state))
  } catch {
    // localStorage unavailable
  }
}

export function getInitialCollapsed(id: string, defaultCollapsed: boolean): boolean {
  const persisted = getCollapseState()
  if (id in persisted) return persisted[id]
  return defaultCollapsed
}
