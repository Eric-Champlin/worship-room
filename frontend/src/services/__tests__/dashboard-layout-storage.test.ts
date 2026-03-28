import { describe, it, expect, beforeEach } from 'vitest'
import {
  getDashboardLayout,
  saveDashboardLayout,
  clearDashboardLayout,
} from '../dashboard-layout-storage'
import type { DashboardLayout } from '@/types/dashboard'

beforeEach(() => {
  localStorage.clear()
})

describe('dashboard-layout-storage', () => {
  it('returns null when no layout saved', () => {
    expect(getDashboardLayout()).toBeNull()
  })

  it('saveDashboardLayout persists to localStorage', () => {
    const layout: DashboardLayout = {
      order: ['votd', 'devotional'],
      hidden: ['streak'],
      customized: true,
    }
    saveDashboardLayout(layout)
    const result = getDashboardLayout()
    expect(result).toEqual(layout)
  })

  it('clearDashboardLayout removes from localStorage', () => {
    saveDashboardLayout({ order: ['votd'], hidden: [], customized: true })
    clearDashboardLayout()
    expect(getDashboardLayout()).toBeNull()
  })

  it('returns null for invalid JSON', () => {
    localStorage.setItem('wr_dashboard_layout', 'not-json')
    expect(getDashboardLayout()).toBeNull()
  })
})
