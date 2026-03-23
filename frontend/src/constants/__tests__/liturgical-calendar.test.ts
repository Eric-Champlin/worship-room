import { describe, it, expect } from 'vitest'
import {
  computeEasterDate,
  getLiturgicalSeason,
  getSeasonStartDate,
  getDayWithinSeason,
  LITURGICAL_SEASONS,
} from '../liturgical-calendar'
import type { LiturgicalSeasonId } from '../liturgical-calendar'

describe('liturgical-calendar', () => {
  describe('computeEasterDate', () => {
    it('returns correct dates for 2026-2029', () => {
      const easter2026 = computeEasterDate(2026)
      expect(easter2026.getFullYear()).toBe(2026)
      expect(easter2026.getMonth()).toBe(3) // April
      expect(easter2026.getDate()).toBe(5)

      const easter2027 = computeEasterDate(2027)
      expect(easter2027.getFullYear()).toBe(2027)
      expect(easter2027.getMonth()).toBe(2) // March
      expect(easter2027.getDate()).toBe(28)

      const easter2028 = computeEasterDate(2028)
      expect(easter2028.getFullYear()).toBe(2028)
      expect(easter2028.getMonth()).toBe(3) // April
      expect(easter2028.getDate()).toBe(16)

      const easter2029 = computeEasterDate(2029)
      expect(easter2029.getFullYear()).toBe(2029)
      expect(easter2029.getMonth()).toBe(3) // April
      expect(easter2029.getDate()).toBe(1)
    })

    it('returns a Sunday for multiple years', () => {
      for (let year = 2020; year <= 2035; year++) {
        const easter = computeEasterDate(year)
        expect(easter.getDay()).toBe(0) // Sunday
      }
    })
  })

  describe('Advent start', () => {
    it('computes Advent start as nearest Sunday to Nov 30', () => {
      // 2026: Nov 30 is Monday → nearest Sunday is Nov 29
      const advent2026 = getSeasonStartDate('advent', new Date(2026, 11, 1))
      expect(advent2026.getMonth()).toBe(10) // November
      expect(advent2026.getDate()).toBe(29)

      // 2027: Nov 30 is Tuesday → nearest Sunday is Nov 28
      const advent2027 = getSeasonStartDate('advent', new Date(2027, 11, 1))
      expect(advent2027.getMonth()).toBe(10) // November
      expect(advent2027.getDate()).toBe(28)

      // 2028: Nov 30 is Thursday → nearest Sunday is Dec 3
      const advent2028 = getSeasonStartDate('advent', new Date(2028, 11, 1))
      expect(advent2028.getMonth()).toBe(11) // December
      expect(advent2028.getDate()).toBe(3)
    })
  })

  describe('Lent dates derived from Easter', () => {
    it('computes Ash Wednesday as Easter - 46 for 2026', () => {
      // Easter 2026 = April 5
      // Ash Wednesday = April 5 - 46 = Feb 18
      const lentStart = getSeasonStartDate('lent', new Date(2026, 2, 1))
      expect(lentStart.getMonth()).toBe(1) // February
      expect(lentStart.getDate()).toBe(18)
    })
  })

  describe('getLiturgicalSeason', () => {
    it('returns Holy Week for dates in Holy Week (priority over Lent)', () => {
      // 2026 Easter = April 5, Palm Sunday = March 29
      const palmSunday = new Date(2026, 2, 29) // March 29
      const result = getLiturgicalSeason(palmSunday)
      expect(result.currentSeason.id).toBe('holy-week')
      expect(result.isNamedSeason).toBe(true)

      // Holy Saturday = April 4
      const holySaturday = new Date(2026, 3, 4)
      const result2 = getLiturgicalSeason(holySaturday)
      expect(result2.currentSeason.id).toBe('holy-week')
    })

    it('returns Epiphany for January 6', () => {
      const epiphany = new Date(2026, 0, 6) // Jan 6
      const result = getLiturgicalSeason(epiphany)
      expect(result.currentSeason.id).toBe('epiphany')
      expect(result.greeting).toBe('Happy Epiphany')
    })

    it('returns Pentecost for Easter + 49', () => {
      // 2026 Easter = April 5, Pentecost = May 24
      const pentecost = new Date(2026, 4, 24)
      const result = getLiturgicalSeason(pentecost)
      expect(result.currentSeason.id).toBe('pentecost')
    })

    it('returns Christmas for Dec 25 through Jan 5', () => {
      const christmas = new Date(2026, 11, 25)
      expect(getLiturgicalSeason(christmas).currentSeason.id).toBe('christmas')

      const dec31 = new Date(2026, 11, 31)
      expect(getLiturgicalSeason(dec31).currentSeason.id).toBe('christmas')

      const jan1 = new Date(2027, 0, 1)
      expect(getLiturgicalSeason(jan1).currentSeason.id).toBe('christmas')

      const jan5 = new Date(2027, 0, 5)
      expect(getLiturgicalSeason(jan5).currentSeason.id).toBe('christmas')
    })

    it('returns Advent for Advent period', () => {
      // 2026 Advent starts Nov 29
      const adventDay = new Date(2026, 10, 29) // Nov 29
      expect(getLiturgicalSeason(adventDay).currentSeason.id).toBe('advent')

      const dec24 = new Date(2026, 11, 24)
      expect(getLiturgicalSeason(dec24).currentSeason.id).toBe('advent')
    })

    it('returns Lent for dates between Ash Wednesday and day before Palm Sunday', () => {
      // 2026 Ash Wednesday = Feb 18, Palm Sunday = March 29
      const lentDay = new Date(2026, 2, 1) // March 1
      const result = getLiturgicalSeason(lentDay)
      expect(result.currentSeason.id).toBe('lent')
      expect(result.greeting).toBe('Blessed Lent')

      // Day before Palm Sunday = March 28
      const dayBeforePalm = new Date(2026, 2, 28)
      expect(getLiturgicalSeason(dayBeforePalm).currentSeason.id).toBe('lent')
    })

    it('returns Easter for Easter Sunday through day before Pentecost', () => {
      // 2026 Easter = April 5, Pentecost = May 24
      const easterDay = new Date(2026, 3, 5) // April 5
      expect(getLiturgicalSeason(easterDay).currentSeason.id).toBe('easter')

      const dayBeforePentecost = new Date(2026, 4, 23) // May 23
      expect(getLiturgicalSeason(dayBeforePentecost).currentSeason.id).toBe('easter')
    })

    it('returns Ordinary Time for dates outside all named seasons', () => {
      // Mid-July 2026
      const july15 = new Date(2026, 6, 15)
      const result = getLiturgicalSeason(july15)
      expect(result.currentSeason.id).toBe('ordinary-time')
      expect(result.isNamedSeason).toBe(false)

      // Mid-October 2026
      const oct15 = new Date(2026, 9, 15)
      expect(getLiturgicalSeason(oct15).currentSeason.id).toBe('ordinary-time')
    })

    it('returns isNamedSeason=false for Ordinary Time', () => {
      const july15 = new Date(2026, 6, 15)
      const result = getLiturgicalSeason(july15)
      expect(result.isNamedSeason).toBe(false)
    })

    it('returns empty greeting for Ordinary Time', () => {
      const july15 = new Date(2026, 6, 15)
      const result = getLiturgicalSeason(july15)
      expect(result.greeting).toBe('')
    })

    it('computes daysUntilNextSeason correctly', () => {
      // Mid-Advent 2026 (Dec 10), next season = Christmas Dec 25 → 15 days
      const dec10 = new Date(2026, 11, 10)
      const result = getLiturgicalSeason(dec10)
      expect(result.currentSeason.id).toBe('advent')
      expect(result.daysUntilNextSeason).toBe(15)
    })

    it('maps every day of a year to exactly one season (no gaps)', () => {
      const year = 2026
      for (let month = 0; month < 12; month++) {
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day)
          const result = getLiturgicalSeason(date)
          expect(result.currentSeason).toBeDefined()
          expect(result.currentSeason.id).toBeTruthy()
          expect(result.seasonName).toBeTruthy()
        }
      }
    })

    it('handles leap year 2028 correctly', () => {
      // Feb 29, 2028 exists
      const feb29 = new Date(2028, 1, 29)
      const result = getLiturgicalSeason(feb29)
      expect(result.currentSeason).toBeDefined()
      expect(result.currentSeason.id).toBeTruthy()

      // Verify all days in 2028 map to a season
      for (let month = 0; month < 12; month++) {
        const daysInMonth = new Date(2028, month + 1, 0).getDate()
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(2028, month, day)
          const result2 = getLiturgicalSeason(date)
          expect(result2.currentSeason).toBeDefined()
        }
      }
    })
  })

  describe('LITURGICAL_SEASONS', () => {
    it('defines all 8 seasons', () => {
      const ids: LiturgicalSeasonId[] = [
        'advent',
        'christmas',
        'epiphany',
        'lent',
        'holy-week',
        'easter',
        'pentecost',
        'ordinary-time',
      ]
      for (const id of ids) {
        expect(LITURGICAL_SEASONS[id]).toBeDefined()
        expect(LITURGICAL_SEASONS[id].name).toBeTruthy()
        expect(LITURGICAL_SEASONS[id].themeColor).toMatch(/^#[0-9A-Fa-f]{6}$/)
        expect(LITURGICAL_SEASONS[id].icon).toBeTruthy()
        expect(LITURGICAL_SEASONS[id].themeWord).toBeTruthy()
      }
    })
  })

  describe('getSeasonStartDate', () => {
    it('returns correct season start dates', () => {
      // Lent 2026: Ash Wednesday = Easter(April 5) - 46 = Feb 18
      const lentStart = getSeasonStartDate('lent', new Date(2026, 2, 1))
      expect(lentStart.getMonth()).toBe(1)
      expect(lentStart.getDate()).toBe(18)

      // Easter 2026: April 5
      const easterStart = getSeasonStartDate('easter', new Date(2026, 3, 10))
      expect(easterStart.getMonth()).toBe(3)
      expect(easterStart.getDate()).toBe(5)

      // Christmas: Dec 25
      const christmasStart = getSeasonStartDate('christmas', new Date(2026, 11, 26))
      expect(christmasStart.getMonth()).toBe(11)
      expect(christmasStart.getDate()).toBe(25)

      // Christmas for Jan 3 (prior year's Christmas)
      const christmasJan = getSeasonStartDate('christmas', new Date(2027, 0, 3))
      expect(christmasJan.getMonth()).toBe(11) // Dec
      expect(christmasJan.getFullYear()).toBe(2026)
      expect(christmasJan.getDate()).toBe(25)
    })
  })

  describe('getDayWithinSeason', () => {
    it('returns 0 for the first day of a season', () => {
      // Easter 2026 = April 5
      expect(getDayWithinSeason('easter', new Date(2026, 3, 5))).toBe(0)
    })

    it('returns correct day count within a season', () => {
      // Advent 2026 starts Nov 29, Dec 5 = day 6
      expect(getDayWithinSeason('advent', new Date(2026, 11, 5))).toBe(6)
    })
  })
})
