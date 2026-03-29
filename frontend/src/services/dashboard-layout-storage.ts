import type { DashboardLayout } from '@/types/dashboard'

const LAYOUT_KEY = 'wr_dashboard_layout'

export function getDashboardLayout(): DashboardLayout | null {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (_e) {
    // localStorage may be unavailable or data malformed
    return null
  }
}

export function saveDashboardLayout(layout: DashboardLayout): void {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout))
  } catch (_e) {
    // localStorage may be unavailable
  }
}

export function clearDashboardLayout(): void {
  try {
    localStorage.removeItem(LAYOUT_KEY)
  } catch (_e) {
    // localStorage may be unavailable
  }
}
