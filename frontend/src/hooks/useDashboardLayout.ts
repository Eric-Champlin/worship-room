import { useState, useCallback, useMemo } from 'react'
import type { DashboardLayout } from '@/types/dashboard'
import {
  type WidgetId,
  WIDGET_MAP,
  TIME_OF_DAY_ORDERS,
  getTimeOfDay,
} from '@/constants/dashboard/widget-order'
import {
  getDashboardLayout,
  saveDashboardLayout,
  clearDashboardLayout,
} from '@/services/dashboard-layout-storage'

interface UseDashboardLayoutResult {
  orderedWidgets: WidgetId[]
  layout: DashboardLayout | null
  isCustomized: boolean
  updateOrder: (newOrder: WidgetId[]) => void
  toggleVisibility: (id: WidgetId, visible: boolean) => void
  resetToDefault: () => void
}

function isValidWidgetId(id: string): id is WidgetId {
  return id in WIDGET_MAP
}

export function useDashboardLayout(
  visibility: Partial<Record<WidgetId, boolean>>,
): UseDashboardLayoutResult {
  const [layout, setLayout] = useState<DashboardLayout | null>(() => getDashboardLayout())

  const timeOfDay = useMemo(() => getTimeOfDay(), [])

  const orderedWidgets = useMemo(() => {
    let order: WidgetId[]

    if (layout && layout.customized) {
      // User has customized — use their order, filtering out unknown IDs
      order = layout.order.filter(isValidWidgetId)
      // Filter out hidden widgets
      const hiddenSet = new Set(layout.hidden)
      order = order.filter((id) => !hiddenSet.has(id))
    } else {
      // Use time-of-day default ordering
      order = [...TIME_OF_DAY_ORDERS[timeOfDay]]
    }

    // Filter out conditionally invisible widgets
    order = order.filter((id) => visibility[id] !== false)

    // Getting Started always renders first when visible (spec req 10)
    const gsIndex = order.indexOf('getting-started')
    if (gsIndex > 0) {
      order.splice(gsIndex, 1)
      order.unshift('getting-started')
    } else if (gsIndex === -1 && visibility['getting-started'] !== false) {
      // Getting Started isn't in any time-of-day order, but if visible, prepend it
      if (layout && layout.customized) {
        // Only add if it was in the user's order (already handled above) or not hidden
        const hiddenSet = new Set(layout.hidden)
        if (!hiddenSet.has('getting-started')) {
          order.unshift('getting-started')
        }
      } else {
        order.unshift('getting-started')
      }
    }

    return order
  }, [layout, timeOfDay, visibility])

  const updateOrder = useCallback((newOrder: WidgetId[]) => {
    const newLayout: DashboardLayout = {
      order: newOrder,
      hidden: getDashboardLayout()?.hidden ?? [],
      customized: true,
    }
    saveDashboardLayout(newLayout)
    setLayout(newLayout)
  }, [])

  const toggleVisibility = useCallback((id: WidgetId, visible: boolean) => {
    const current = getDashboardLayout()
    const hidden = new Set(current?.hidden ?? [])
    if (visible) {
      hidden.delete(id)
    } else {
      hidden.add(id)
    }
    const newLayout: DashboardLayout = {
      order: current?.order ?? [],
      hidden: [...hidden],
      customized: current?.customized ?? false,
    }
    saveDashboardLayout(newLayout)
    setLayout(newLayout)
  }, [])

  const resetToDefault = useCallback(() => {
    clearDashboardLayout()
    setLayout(null)
  }, [])

  return {
    orderedWidgets,
    layout,
    isCustomized: layout?.customized ?? false,
    updateOrder,
    toggleVisibility,
    resetToDefault,
  }
}
