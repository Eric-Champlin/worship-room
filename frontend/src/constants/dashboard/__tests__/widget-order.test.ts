import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  getTimeOfDay,
  TIME_OF_DAY_ORDERS,
  WIDGET_DEFINITIONS,
  WIDGET_MAP,
} from '../widget-order'

function mockHour(hour: number) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 2, 28, hour, 0, 0))
}

afterEach(() => {
  vi.useRealTimers()
})

describe('getTimeOfDay', () => {
  it.each([5, 8, 11])('returns morning for hour %d', (hour) => {
    mockHour(hour)
    expect(getTimeOfDay()).toBe('morning')
  })

  it.each([12, 14, 16])('returns afternoon for hour %d', (hour) => {
    mockHour(hour)
    expect(getTimeOfDay()).toBe('afternoon')
  })

  it.each([17, 19, 21])('returns evening for hour %d', (hour) => {
    mockHour(hour)
    expect(getTimeOfDay()).toBe('evening')
  })

  it.each([22, 0, 4])('returns night for hour %d', (hour) => {
    mockHour(hour)
    expect(getTimeOfDay()).toBe('night')
  })
})

describe('TIME_OF_DAY_ORDERS', () => {
  const validWidgetIds = new Set(WIDGET_DEFINITIONS.map((w) => w.id))

  it.each(['morning', 'afternoon', 'evening', 'night'] as const)(
    'all entries in %s order are valid WidgetIds',
    (timeOfDay) => {
      for (const id of TIME_OF_DAY_ORDERS[timeOfDay]) {
        expect(validWidgetIds.has(id)).toBe(true)
      }
    },
  )

  it('morning order has anniversary first, then devotional', () => {
    expect(TIME_OF_DAY_ORDERS.morning[0]).toBe('anniversary')
    expect(TIME_OF_DAY_ORDERS.morning[1]).toBe('devotional')
  })

  it('evening order has anniversary first, then evening-reflection', () => {
    expect(TIME_OF_DAY_ORDERS.evening[0]).toBe('anniversary')
    expect(TIME_OF_DAY_ORDERS.evening[1]).toBe('evening-reflection')
  })

  it('getting-started is not in any time-of-day order', () => {
    for (const [, order] of Object.entries(TIME_OF_DAY_ORDERS)) {
      expect(order).not.toContain('getting-started')
    }
  })
})

describe('WIDGET_MAP', () => {
  it('has an entry for every WIDGET_DEFINITIONS item', () => {
    expect(Object.keys(WIDGET_MAP)).toHaveLength(WIDGET_DEFINITIONS.length)
    for (const def of WIDGET_DEFINITIONS) {
      expect(WIDGET_MAP[def.id]).toBe(def)
    }
  })
})
