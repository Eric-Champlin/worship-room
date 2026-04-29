import { describe, it, expect, vi } from 'vitest'
import scenarios from '../../../../_test_fixtures/qotd-rotation.json'

/**
 * Spec 3.9 drift detection — asserts that the frontend `getTodaysQuestion(date)`
 * agrees with the backend `QotdService.findForDate(date)` modulo-72 rotation
 * for every scenario in `_test_fixtures/qotd-rotation.json`. The backend half
 * lives at `backend/src/test/java/com/worshiproom/post/QotdDriftDetectionTest.java`.
 *
 * Liturgical-season-aware rotation is deferred to Phase 9.2 (spec D1). The backend
 * has no seasonal branch yet, so this test mocks `getLiturgicalSeason` to force the
 * frontend through the same modulo-72 path. When Phase 9.2 ships and the backend
 * gains seasonal awareness, this mock can be removed and seasonal scenarios added
 * to the fixture file.
 */
vi.mock('@/constants/liturgical-calendar', async () => {
  const actual = await vi.importActual<
    typeof import('@/constants/liturgical-calendar')
  >('@/constants/liturgical-calendar')
  const ordinaryTime = actual.LITURGICAL_SEASONS['ordinary-time']
  return {
    ...actual,
    getLiturgicalSeason: () => ({
      currentSeason: ordinaryTime,
      seasonName: ordinaryTime.name,
      themeColor: ordinaryTime.themeColor,
      icon: ordinaryTime.icon,
      greeting: ordinaryTime.greeting,
      daysUntilNextSeason: 0,
      isNamedSeason: false,
    }),
  }
})

import { getTodaysQuestion } from '@/constants/question-of-the-day'

interface Scenario {
  id: string
  date: string
  dayOfYear: number
  expectedQotdId: string
}

const POOL_SIZE = 72

describe('QOTD rotation drift detection (Spec 3.9)', () => {
  it('fixture file has at least one scenario', () => {
    expect(scenarios.scenarios.length).toBeGreaterThan(0)
  })

  scenarios.scenarios.forEach((scenario: Scenario) => {
    describe(`${scenario.id} (${scenario.date})`, () => {
      it('frontend dayOfYear matches fixture', () => {
        // Match Java's LocalDate.getDayOfYear() and the
        // (Date.UTC(y, m, d) - Date.UTC(y, 0, 0)) / 86400000 formula used by
        // getTodaysQuestion(). The backend half asserts the same dayOfYear
        // against java.time.LocalDate.getDayOfYear() so the JSON file can't
        // drift away from either platform's date math.
        const [yearStr, monthStr, dayStr] = scenario.date.split('-')
        const year = Number(yearStr)
        const month = Number(monthStr) - 1
        const day = Number(dayStr)
        const dayOfYear = Math.floor(
          (Date.UTC(year, month, day) - Date.UTC(year, 0, 0)) /
            (1000 * 60 * 60 * 24),
        )
        expect(dayOfYear).toBe(scenario.dayOfYear)
      })

      it('frontend getTodaysQuestion returns the fixture-expected qotd id', () => {
        const date = new Date(`${scenario.date}T12:00:00Z`)
        const result = getTodaysQuestion(date)
        expect(result.id).toBe(scenario.expectedQotdId)
      })

      it('expectedQotdId equals (dayOfYear % 72) + 1 (modulo invariant)', () => {
        // Independent restatement of the rotation rule — guards the fixture
        // against a typo where dayOfYear and expectedQotdId disagree.
        const slot = scenario.dayOfYear % POOL_SIZE
        expect(scenario.expectedQotdId).toBe(`qotd-${slot + 1}`)
      })
    })
  })
})
