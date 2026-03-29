/**
 * Content Counting Scripts for Worship Room
 *
 * Run with: npx tsx _recon/agent-6-count-scripts.ts
 * (from the project root)
 *
 * These scripts programmatically count every content set and compare
 * to spec targets from CLAUDE.md.
 */

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const SRC = join(__dirname, '../frontend/src')

// ─── Helper ───────────────────────────────────────────────────────────────────
function countPattern(filePath: string, pattern: RegExp): number {
  const content = readFileSync(filePath, 'utf-8')
  return (content.match(pattern) || []).length
}

function fileExists(path: string): boolean {
  try {
    readFileSync(path)
    return true
  } catch {
    return false
  }
}

// ─── Bible Books ──────────────────────────────────────────────────────────────
function countBibleBooks(): { jsonFiles: number; booksInConstant: number } {
  const jsonDir = join(SRC, 'data/bible/books/json')
  const jsonFiles = readdirSync(jsonDir).filter((f) => f.endsWith('.json')).length
  const bibleConst = readFileSync(join(SRC, 'constants/bible.ts'), 'utf-8')
  const booksInConstant = (bibleConst.match(/slug:/g) || []).length
  return { jsonFiles, booksInConstant }
}

// ─── Devotionals ──────────────────────────────────────────────────────────────
function countDevotionals(): { total: number; general: number; seasonal: number } {
  const content = readFileSync(join(SRC, 'data/devotionals.ts'), 'utf-8')
  const total = (content.match(/id: 'devotional-/g) || []).length
  const seasonMatches = content.match(/season: '/g) || []
  const seasonal = seasonMatches.length
  return { total, general: total - seasonal, seasonal }
}

// ─── Reading Plans ────────────────────────────────────────────────────────────
function countReadingPlans(): Array<{ name: string; days: number }> {
  const plansDir = join(SRC, 'data/reading-plans')
  const files = readdirSync(plansDir).filter(
    (f) => f.endsWith('.ts') && f !== 'index.ts' && !f.startsWith('__'),
  )
  return files.map((f) => {
    const content = readFileSync(join(plansDir, f), 'utf-8')
    const days = (content.match(/dayNumber:/g) || []).length
    return { name: f.replace('.ts', ''), days }
  })
}

// ─── Ambient Sounds ───────────────────────────────────────────────────────────
function countSounds(): number {
  return countPattern(join(SRC, 'data/sound-catalog.ts'), /id: '/g)
}

// ─── Scene Presets ────────────────────────────────────────────────────────────
function countScenes(): number {
  return countPattern(join(SRC, 'data/scenes.ts'), /id: '/g) - 3 // subtract FEATURED_SCENE_IDS entries
}

// ─── Scripture Readings ───────────────────────────────────────────────────────
function countScriptureReadings(): number {
  return countPattern(join(SRC, 'data/music/scripture-readings.ts'), /id: '/g) - 4 // subtract collection IDs & map
}

// ─── Bedtime Stories ──────────────────────────────────────────────────────────
function countBedtimeStories(): number {
  return countPattern(join(SRC, 'data/music/bedtime-stories.ts'), /id: '/g) - 1 // subtract map entry
}

// ─── Verse of the Day ─────────────────────────────────────────────────────────
function countVotd(): { total: number; seasonal: number; general: number } {
  const content = readFileSync(join(SRC, 'constants/verse-of-the-day.ts'), 'utf-8')
  const total = (content.match(/reference: '/g) || []).length
  const seasonal = (content.match(/season: '/g) || []).length
  return { total, seasonal, general: total - seasonal }
}

// ─── QOTD ─────────────────────────────────────────────────────────────────────
function countQotd(): { total: number; general: number; liturgical: number } {
  const content = readFileSync(join(SRC, 'constants/question-of-the-day.ts'), 'utf-8')
  const total = (content.match(/id: 'qotd-/g) || []).length
  const liturgical = (content.match(/liturgicalSeason: '/g) || []).length
  return { total, general: total - liturgical, liturgical }
}

// ─── Challenges ───────────────────────────────────────────────────────────────
function countChallenges(): Array<{ id: string; days: number }> {
  const content = readFileSync(join(SRC, 'data/challenges.ts'), 'utf-8')
  const ids = content.match(/id: '[\w-]+'/g) || []
  const challengeIds = ids
    .map((m) => m.replace("id: '", '').replace("'", ''))
    .filter((id) => !id.startsWith('day') && id.includes('-'))
  const durations = content.match(/durationDays: \d+/g) || []
  return challengeIds.map((id, i) => ({
    id,
    days: parseInt(durations[i]?.replace('durationDays: ', '') || '0'),
  }))
}

// ─── Guided Prayer Sessions ──────────────────────────────────────────────────
function countGuidedPrayer(): number {
  const content = readFileSync(join(SRC, 'data/guided-prayer-sessions.ts'), 'utf-8')
  // Each session has a unique id field
  return (content.match(/^\s*id: '/gm) || []).length
}

// ─── Playlists ────────────────────────────────────────────────────────────────
function countPlaylists(): number {
  return countPattern(join(SRC, 'data/music/playlists.ts'), /id: '/g)
}

// ─── Routine Templates ───────────────────────────────────────────────────────
function countRoutines(): number {
  return countPattern(join(SRC, 'data/music/routines.ts'), /id: 'template-/g)
}

// ─── Mock Data Sets ───────────────────────────────────────────────────────────
function countMockData(): Record<string, number> {
  const mockDir = join(SRC, 'mocks')
  const counts: Record<string, number> = {}

  // Daily songs
  const dailyMock = readFileSync(join(SRC, 'mocks/daily-experience-mock-data.ts'), 'utf-8')
  counts['dailySongs'] = (dailyMock.match(/id: 'song-/g) || []).length
  counts['dailyVerses'] = (dailyMock.match(/id: 'verse-/g) || []).length
  counts['mockPrayers'] = (dailyMock.match(/id: 'prayer-/g) || []).length
  counts['classicPrayers'] = (dailyMock.match(/id: 'classic-/g) || []).length
  counts['journalPrompts'] = (dailyMock.match(/id: 'prompt-/g) || []).length
  counts['journalReflections'] = (dailyMock.match(/id: 'reflect-/g) || []).length
  counts['breathingVerses'] = (dailyMock.match(/id: 'breath-/g) || []).length
  counts['soakingVerses'] = (dailyMock.match(/id: 'soak-/g) || []).length

  // Ask mock topics
  const askMock = readFileSync(join(SRC, 'mocks/ask-mock-data.ts'), 'utf-8')
  counts['askTopics'] = Object.keys(
    JSON.parse(
      '{"' +
        (askMock.match(/^\s{2}\w+: \{/gm) || [])
          .map((m) => m.trim().replace(': {', ''))
          .join('":1,"') +
        '":1}',
    ),
  ).length

  return counts
}

// ─── Song of the Day uniqueness ──────────────────────────────────────────────
function countUniqueSongs(): { total: number; unique: number } {
  const content = readFileSync(join(SRC, 'mocks/daily-experience-mock-data.ts'), 'utf-8')
  const trackIds = content.match(/trackId: '([^']+)'/g) || []
  const ids = trackIds.map((m) => m.replace("trackId: '", '').replace("'", ''))
  return { total: ids.length, unique: new Set(ids).length }
}

// ─── Run All Counts ──────────────────────────────────────────────────────────

console.log('=== WORSHIP ROOM CONTENT INVENTORY ===\n')

const bible = countBibleBooks()
console.log(`Bible Books:          ${bible.jsonFiles} JSON files, ${bible.booksInConstant} in BIBLE_BOOKS constant (target: 66)`)

const devos = countDevotionals()
console.log(`Devotionals:          ${devos.total} total (${devos.general} general + ${devos.seasonal} seasonal) (target: 50 = 30+20)`)

const plans = countReadingPlans()
console.log(`Reading Plans:        ${plans.length} plans (target: 10)`)
plans.forEach((p) => console.log(`  - ${p.name}: ${p.days} days`))

const sounds = countSounds()
console.log(`Ambient Sounds:       ${sounds} (target: 24)`)

const scenes = countScenes()
console.log(`Scene Presets:        ${scenes} (target: 11)`)

const readings = countScriptureReadings()
console.log(`Scripture Readings:   ${readings} (target: 24)`)

const stories = countBedtimeStories()
console.log(`Bedtime Stories:      ${stories} (target: 12)`)

const votd = countVotd()
console.log(`Verse of the Day:     ${votd.total} (${votd.general} general + ${votd.seasonal} seasonal) (target: 60)`)

const qotd = countQotd()
console.log(`QOTD:                 ${qotd.total} (${qotd.general} general + ${qotd.liturgical} liturgical) (target: 72 = 60+12)`)

const challenges = countChallenges()
console.log(`Challenges:           ${challenges.length} (target: 5)`)
challenges.forEach((c) => console.log(`  - ${c.id}: ${c.days} days`))

const guidedPrayer = countGuidedPrayer()
console.log(`Guided Prayer:        ${guidedPrayer} sessions (target: 8)`)

const playlists = countPlaylists()
console.log(`Spotify Playlists:    ${playlists} (target: 7-8)`)

const routines = countRoutines()
console.log(`Routine Templates:    ${routines} (target: 3-4)`)

const songs = countUniqueSongs()
console.log(`Song of the Day:      ${songs.total} entries, ${songs.unique} unique tracks (only 14 unique in a 30-entry pool)`)

console.log('\n=== MOCK DATA COUNTS ===\n')
const mock = countMockData()
Object.entries(mock).forEach(([key, val]) => console.log(`  ${key}: ${val}`))

// Summary table
console.log('\n=== SUMMARY TABLE ===\n')
console.log('Content Type          | Actual | Target | Status')
console.log('─────────────────────-|--------|--------|──────────────')
console.log(`Bible Books (JSON)    | ${bible.jsonFiles.toString().padStart(6)} | ${('66').padStart(6)} | ${bible.jsonFiles === 66 ? 'PASS' : 'FAIL'}`)
console.log(`Bible Books (const)   | ${bible.booksInConstant.toString().padStart(6)} | ${('66').padStart(6)} | ${bible.booksInConstant === 66 ? 'PASS' : 'FAIL'}`)
console.log(`Devotionals           | ${devos.total.toString().padStart(6)} | ${('50').padStart(6)} | ${devos.total >= 50 ? 'PASS' : 'FAIL'}`)
console.log(`Reading Plans         | ${plans.length.toString().padStart(6)} | ${('10').padStart(6)} | ${plans.length >= 10 ? 'PASS' : 'FAIL'}`)
console.log(`Ambient Sounds        | ${sounds.toString().padStart(6)} | ${('24').padStart(6)} | ${sounds >= 24 ? 'PASS' : 'FAIL'}`)
console.log(`Scene Presets         | ${scenes.toString().padStart(6)} | ${('11').padStart(6)} | ${scenes >= 11 ? 'PASS' : 'FAIL'}`)
console.log(`Scripture Readings    | ${readings.toString().padStart(6)} | ${('24').padStart(6)} | ${readings >= 24 ? 'PASS' : 'FAIL'}`)
console.log(`Bedtime Stories       | ${stories.toString().padStart(6)} | ${('12').padStart(6)} | ${stories >= 12 ? 'PASS' : 'FAIL'}`)
console.log(`Verse of the Day      | ${votd.total.toString().padStart(6)} | ${('60').padStart(6)} | ${votd.total >= 60 ? 'PASS' : 'FAIL'}`)
console.log(`QOTD                  | ${qotd.total.toString().padStart(6)} | ${('72').padStart(6)} | ${qotd.total >= 72 ? 'PASS' : 'FAIL'}`)
console.log(`Challenges            | ${challenges.length.toString().padStart(6)} | ${('5').padStart(6)} | ${challenges.length >= 5 ? 'PASS' : 'FAIL'}`)
console.log(`Guided Prayer         | ${guidedPrayer.toString().padStart(6)} | ${('8').padStart(6)} | ${guidedPrayer >= 8 ? 'PASS' : 'FAIL'}`)
console.log(`Spotify Playlists     | ${playlists.toString().padStart(6)} | ${('7').padStart(6)} | ${playlists >= 7 ? 'PASS' : 'FAIL'}`)
console.log(`Routine Templates     | ${routines.toString().padStart(6)} | ${('4').padStart(6)} | ${routines >= 4 ? 'PASS' : 'FAIL'}`)
