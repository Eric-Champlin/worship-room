import { describe, expect, it } from 'vitest'
import {
  ALL_SCRIPTURE_READINGS,
  SCRIPTURE_COLLECTIONS,
  SCRIPTURE_READING_BY_ID,
} from '../scripture-readings'

describe('Scripture Readings Data', () => {
  it('has 4 collections with 6 readings each (24 total)', () => {
    expect(SCRIPTURE_COLLECTIONS).toHaveLength(4)
    for (const collection of SCRIPTURE_COLLECTIONS) {
      expect(collection.readings).toHaveLength(6)
    }
    expect(ALL_SCRIPTURE_READINGS).toHaveLength(24)
  })

  it('every reading has non-empty webText', () => {
    for (const reading of ALL_SCRIPTURE_READINGS) {
      expect(reading.webText.trim().length).toBeGreaterThan(0)
    }
  })

  it('every reading has a valid scriptureReference', () => {
    for (const reading of ALL_SCRIPTURE_READINGS) {
      expect(reading.scriptureReference.trim().length).toBeGreaterThan(0)
    }
  })

  it('every reading has a valid voiceId', () => {
    for (const reading of ALL_SCRIPTURE_READINGS) {
      expect(['male', 'female']).toContain(reading.voiceId)
    }
  })

  it('voice alternates within each collection', () => {
    for (const collection of SCRIPTURE_COLLECTIONS) {
      const voices = collection.readings.map((r) => r.voiceId)
      for (let i = 1; i < voices.length; i++) {
        expect(voices[i]).not.toBe(voices[i - 1])
      }
    }
  })

  it('SCRIPTURE_READING_BY_ID Map contains all 24 readings', () => {
    expect(SCRIPTURE_READING_BY_ID.size).toBe(24)
    for (const reading of ALL_SCRIPTURE_READINGS) {
      expect(SCRIPTURE_READING_BY_ID.get(reading.id)).toBe(reading)
    }
  })

  it('all audioFilename values are unique and follow expected pattern', () => {
    const filenames = ALL_SCRIPTURE_READINGS.map((r) => r.audioFilename)
    const uniqueFilenames = new Set(filenames)
    expect(uniqueFilenames.size).toBe(24)

    for (const filename of filenames) {
      expect(filename).toMatch(/^scripture\/[\w-]+\.mp3$/)
    }
  })

  it('durationSeconds is positive for all readings', () => {
    for (const reading of ALL_SCRIPTURE_READINGS) {
      expect(reading.durationSeconds).toBeGreaterThan(0)
    }
  })

  it('each reading has the correct collectionId', () => {
    for (const collection of SCRIPTURE_COLLECTIONS) {
      for (const reading of collection.readings) {
        expect(reading.collectionId).toBe(collection.id)
      }
    }
  })

  it('all reading IDs are unique', () => {
    const ids = ALL_SCRIPTURE_READINGS.map((r) => r.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(24)
  })
})
