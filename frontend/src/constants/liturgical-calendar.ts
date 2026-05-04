// Liturgical Calendar Constants & Algorithm
// Computes the current Christian liturgical season for any year.
// All moveable feasts are derived from Easter via the Anonymous Gregorian (Computus) algorithm.

export type LiturgicalSeasonId =
  | 'advent'
  | 'christmas'
  | 'epiphany'
  | 'lent'
  | 'holy-week'
  | 'easter'
  | 'pentecost'
  | 'ordinary-time'

export interface LiturgicalSeason {
  id: LiturgicalSeasonId
  name: string
  themeColor: string
  icon: string
  greeting: string
  suggestedContent: string[]
  themeWord: string
}

export interface LiturgicalSeasonResult {
  currentSeason: LiturgicalSeason
  seasonName: string
  themeColor: string
  icon: string
  greeting: string
  daysUntilNextSeason: number
  isNamedSeason: boolean
}

export const LITURGICAL_SEASONS: Record<LiturgicalSeasonId, LiturgicalSeason> = {
  advent: {
    id: 'advent',
    name: 'Advent',
    themeColor: '#7C3AED',
    icon: 'Star',
    greeting: 'Blessed Advent',
    suggestedContent: ['hope', 'waiting', 'prophecy', 'preparation'],
    themeWord: 'hope and anticipation',
  },
  christmas: {
    id: 'christmas',
    name: 'Christmas',
    themeColor: '#FBBF24',
    icon: 'Gift',
    greeting: 'Merry Christmas',
    suggestedContent: ['incarnation', 'gift of God', 'peace on earth'],
    themeWord: 'joy and celebration',
  },
  epiphany: {
    id: 'epiphany',
    name: 'Epiphany',
    themeColor: '#FBBF24',
    icon: 'Sparkles',
    greeting: 'Happy Epiphany',
    suggestedContent: ['revelation', 'light', 'the Magi'],
    themeWord: 'revelation and light',
  },
  lent: {
    id: 'lent',
    name: 'Lent',
    themeColor: '#6B21A8',
    icon: 'Heart',
    greeting: 'Blessed Lent',
    suggestedContent: ['repentance', 'fasting', 'humility', 'sacrifice', 'renewal'],
    themeWord: 'renewal',
  },
  'holy-week': {
    id: 'holy-week',
    name: 'Holy Week',
    themeColor: '#991B1B',
    icon: 'Cross',
    greeting: 'Blessed Holy Week',
    suggestedContent: ['sacrifice', 'the cross', 'redemption'],
    themeWord: 'sacrifice and redemption',
  },
  easter: {
    id: 'easter',
    name: 'Easter',
    themeColor: '#FDE68A',
    icon: 'Sun',
    greeting: 'Happy Easter',
    suggestedContent: ['resurrection', 'new life', 'victory over death'],
    themeWord: 'resurrection and new life',
  },
  pentecost: {
    id: 'pentecost',
    name: 'Pentecost',
    themeColor: '#DC2626',
    icon: 'Flame',
    greeting: 'Happy Pentecost',
    suggestedContent: ['Holy Spirit', 'empowerment', 'the church'],
    themeWord: 'the Holy Spirit',
  },
  'ordinary-time': {
    id: 'ordinary-time',
    name: 'Ordinary Time',
    themeColor: '#059669',
    icon: 'Leaf',
    greeting: '',
    suggestedContent: ['growth', 'discipleship', 'daily faithfulness'],
    themeWord: 'growth',
  },
}

/**
 * Computes Easter Sunday for a given year using the Anonymous Gregorian algorithm (Computus).
 * Returns a Date object set to the local date of Easter.
 */
export function computeEasterDate(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(year, month - 1, day)
}

/**
 * Returns the start date of Advent for the given year.
 * Advent begins on the nearest Sunday to November 30 (range: Nov 27–Dec 3).
 */
export function getAdventStart(year: number): Date {
  const nov30 = new Date(year, 10, 30) // Nov 30
  const dayOfWeek = nov30.getDay() // 0=Sun, 1=Mon, ...
  // Find nearest Sunday: if dayOfWeek <= 3, go back; if > 3, go forward
  let offset: number
  if (dayOfWeek === 0) {
    offset = 0
  } else if (dayOfWeek <= 3) {
    offset = -dayOfWeek
  } else {
    offset = 7 - dayOfWeek
  }
  return new Date(year, 10, 30 + offset)
}

interface SeasonDateRange {
  start: Date
  end: Date
  id: LiturgicalSeasonId
}

/**
 * Computes all season date ranges for seasons relevant to a given date.
 * Returns them in priority order for overlap resolution.
 */
function getSeasonRangesForDate(date: Date): SeasonDateRange[] {
  const year = date.getFullYear()
  const month = date.getMonth()

  const easter = computeEasterDate(year)
  const adventStart = getAdventStart(year)

  const ranges: SeasonDateRange[] = []

  // Holy Week: Palm Sunday (Easter - 7) through Holy Saturday (Easter - 1)
  const palmSunday = new Date(year, easter.getMonth(), easter.getDate() - 7)
  const holySaturday = new Date(year, easter.getMonth(), easter.getDate() - 1)
  ranges.push({ start: palmSunday, end: holySaturday, id: 'holy-week' })

  // Epiphany: January 6 (single day) — check current year
  ranges.push({ start: new Date(year, 0, 6), end: new Date(year, 0, 6), id: 'epiphany' })

  // Pentecost: Easter + 49 (single day)
  const pentecostDate = new Date(year, easter.getMonth(), easter.getDate() + 49)
  ranges.push({ start: pentecostDate, end: pentecostDate, id: 'pentecost' })

  // Christmas: Dec 25 through Jan 5
  // Current year's Christmas season
  ranges.push({ start: new Date(year, 11, 25), end: new Date(year + 1, 0, 5), id: 'christmas' })
  // Previous year's Christmas season (for Jan 1-5)
  if (month <= 0) {
    ranges.push({
      start: new Date(year - 1, 11, 25),
      end: new Date(year, 0, 5),
      id: 'christmas',
    })
  }

  // Advent: Advent Sunday through Dec 24
  ranges.push({ start: adventStart, end: new Date(year, 11, 24), id: 'advent' })
  // Previous year's Advent (for early January edge — unlikely but safe)
  if (month <= 0) {
    const prevAdventStart = getAdventStart(year - 1)
    ranges.push({
      start: prevAdventStart,
      end: new Date(year - 1, 11, 24),
      id: 'advent',
    })
  }

  // Lent: Ash Wednesday (Easter - 46) through day before Palm Sunday (Easter - 8)
  const ashWednesday = new Date(year, easter.getMonth(), easter.getDate() - 46)
  const dayBeforePalmSunday = new Date(year, easter.getMonth(), easter.getDate() - 8)
  ranges.push({ start: ashWednesday, end: dayBeforePalmSunday, id: 'lent' })

  // Easter: Easter Sunday through day before Pentecost (Easter + 48)
  const dayBeforePentecost = new Date(year, easter.getMonth(), easter.getDate() + 48)
  ranges.push({ start: easter, end: dayBeforePentecost, id: 'easter' })

  return ranges
}

/**
 * Checks if a given date falls within a date range (inclusive, using local dates).
 */
function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const d = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const s = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const e = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  return d >= s && d <= e
}

/**
 * Computes the number of days between two dates (local, ignoring time).
 */
function daysBetween(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round(Math.abs(utcB - utcA) / (1000 * 60 * 60 * 24))
}

const GREETING_RECENCY_WINDOW_DAYS = 14

/**
 * Holiday greetings ("Happy Easter", "Merry Christmas", etc.) only fire within
 * GREETING_RECENCY_WINDOW_DAYS of each season's start. Outside the window, the
 * caller falls back to an empty greeting while still reporting the active
 * seasonName / themeColor / isNamedSeason.
 *
 * Ordinary Time has no holiday greeting; the window concept doesn't apply.
 */
function isWithinGreetingRecencyWindow(
  seasonId: LiturgicalSeasonId,
  date: Date,
): boolean {
  if (seasonId === 'ordinary-time') return false
  const start = getSeasonStartDate(seasonId, date)
  return daysBetween(start, date) <= GREETING_RECENCY_WINDOW_DAYS
}

/**
 * Returns the start date of the next season transition after the current season's end.
 */
function computeDaysUntilNextSeason(date: Date): number {
  const year = date.getFullYear()
  const easter = computeEasterDate(year)
  const nextEaster = computeEasterDate(year + 1)

  // Build an ordered list of season start dates for the current and next year
  const transitions: Date[] = []

  // Current year
  transitions.push(new Date(year, 0, 6)) // Epiphany
  const ashWed = new Date(year, easter.getMonth(), easter.getDate() - 46)
  transitions.push(ashWed) // Lent
  const palmSun = new Date(year, easter.getMonth(), easter.getDate() - 7)
  transitions.push(palmSun) // Holy Week
  transitions.push(easter) // Easter
  const pentecost = new Date(year, easter.getMonth(), easter.getDate() + 49)
  transitions.push(pentecost) // Pentecost
  transitions.push(getAdventStart(year)) // Advent
  transitions.push(new Date(year, 11, 25)) // Christmas

  // Next year
  transitions.push(new Date(year + 1, 0, 6)) // Epiphany
  const nextAshWed = new Date(
    year + 1,
    nextEaster.getMonth(),
    nextEaster.getDate() - 46,
  )
  transitions.push(nextAshWed) // Lent
  const nextPalmSun = new Date(
    year + 1,
    nextEaster.getMonth(),
    nextEaster.getDate() - 7,
  )
  transitions.push(nextPalmSun) // Holy Week
  transitions.push(nextEaster) // Easter
  const nextPentecost = new Date(
    year + 1,
    nextEaster.getMonth(),
    nextEaster.getDate() + 49,
  )
  transitions.push(nextPentecost) // Pentecost
  transitions.push(getAdventStart(year + 1)) // Advent
  transitions.push(new Date(year + 1, 11, 25)) // Christmas

  // Sort transitions chronologically
  transitions.sort((a, b) => a.getTime() - b.getTime())

  // Find the next transition date strictly after today
  const todayUTC = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  for (const t of transitions) {
    const tUTC = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())
    if (tUTC > todayUTC) {
      return Math.round((tUTC - todayUTC) / (1000 * 60 * 60 * 24))
    }
  }

  // Fallback (should not happen)
  return 0
}

/**
 * Returns the start date of a season for a given reference date.
 * Exported for use by seasonal content selection functions.
 */
export function getSeasonStartDate(seasonId: LiturgicalSeasonId, date: Date): Date {
  const year = date.getFullYear()
  const easter = computeEasterDate(year)

  switch (seasonId) {
    case 'advent':
      return getAdventStart(year)
    case 'christmas': {
      // If date is in January (part of prior year's Christmas), use Dec 25 of prior year
      if (date.getMonth() === 0 && date.getDate() <= 5) {
        return new Date(year - 1, 11, 25)
      }
      return new Date(year, 11, 25)
    }
    case 'epiphany':
      return new Date(year, 0, 6)
    case 'lent':
      return new Date(year, easter.getMonth(), easter.getDate() - 46)
    case 'holy-week':
      return new Date(year, easter.getMonth(), easter.getDate() - 7)
    case 'easter':
      return new Date(easter.getFullYear(), easter.getMonth(), easter.getDate())
    case 'pentecost':
      return new Date(year, easter.getMonth(), easter.getDate() + 49)
    case 'ordinary-time':
      // Ordinary Time doesn't have a single start — return the date itself
      return date
  }
}

/**
 * Computes the day-within-season for seasonal content cycling.
 * Returns the number of days since the season started (0-indexed).
 */
export function getDayWithinSeason(seasonId: LiturgicalSeasonId, date: Date): number {
  const start = getSeasonStartDate(seasonId, date)
  return daysBetween(start, date)
}

/**
 * Octave of Easter window — Easter Sunday + 7 days (inclusive).
 *
 * Used by SeasonalBanner to cap the "He is risen!" banner so it doesn't linger
 * for the full 49-day Easter liturgical season. Returns true on Easter Sunday
 * and the seven days that follow; false outside that window.
 */
export function isWithinEasterOctave(date: Date = new Date()): boolean {
  const year = date.getFullYear()
  const easter = computeEasterDate(year)
  const msPerDay = 1000 * 60 * 60 * 24
  const utcEaster = Date.UTC(easter.getFullYear(), easter.getMonth(), easter.getDate())
  const utcNow = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const daysSinceEaster = Math.floor((utcNow - utcEaster) / msPerDay)
  return daysSinceEaster >= 0 && daysSinceEaster < 8
}

/**
 * Returns the liturgical season for a given date.
 * Priority order: Holy Week > Epiphany > Pentecost > Christmas > Advent > Lent > Easter > Ordinary Time
 */
export function getLiturgicalSeason(date: Date = new Date()): LiturgicalSeasonResult {
  const ranges = getSeasonRangesForDate(date)

  // Check ranges in priority order (already ordered by getSeasonRangesForDate)
  for (const range of ranges) {
    if (isDateInRange(date, range.start, range.end)) {
      const season = LITURGICAL_SEASONS[range.id]
      return {
        currentSeason: season,
        seasonName: season.name,
        themeColor: season.themeColor,
        icon: season.icon,
        greeting: isWithinGreetingRecencyWindow(range.id, date)
          ? season.greeting
          : '',
        daysUntilNextSeason: computeDaysUntilNextSeason(date),
        isNamedSeason: range.id !== 'ordinary-time',
      }
    }
  }

  // Default: Ordinary Time
  const ordinaryTime = LITURGICAL_SEASONS['ordinary-time']
  return {
    currentSeason: ordinaryTime,
    seasonName: ordinaryTime.name,
    themeColor: ordinaryTime.themeColor,
    icon: ordinaryTime.icon,
    greeting: ordinaryTime.greeting,
    daysUntilNextSeason: computeDaysUntilNextSeason(date),
    isNamedSeason: false,
  }
}
