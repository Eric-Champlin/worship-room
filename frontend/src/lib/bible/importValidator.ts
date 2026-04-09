import type { BibleExportV1 } from '@/types/bible-export'
import { CURRENT_SCHEMA_VERSION } from '@/types/bible-export'

export type ValidationResult =
  | { valid: true; export: BibleExportV1 }
  | { valid: false; error: string }

const ERROR_INVALID =
  "This file isn't a valid Worship Room export. It might be corrupted or from a different app."
const ERROR_NEWER_VERSION =
  'This export was made with a newer version of Worship Room. Update the app to import it.'
const ERROR_MISSING_DATA =
  'This export is missing required data. It might be corrupted.'

const DATA_KEYS = [
  'highlights',
  'bookmarks',
  'notes',
  'prayers',
  'journals',
  'meditations',
] as const

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function hasString(obj: Record<string, unknown>, key: string): boolean {
  return typeof obj[key] === 'string'
}

function hasNumber(obj: Record<string, unknown>, key: string): boolean {
  return typeof obj[key] === 'number'
}

function hasInteger(obj: Record<string, unknown>, key: string): boolean {
  return typeof obj[key] === 'number' && Number.isInteger(obj[key])
}

function validateHighlight(r: unknown): boolean {
  if (!isObject(r)) return false
  return (
    hasString(r, 'id') &&
    hasString(r, 'book') &&
    hasInteger(r, 'chapter') &&
    hasInteger(r, 'startVerse') &&
    hasInteger(r, 'endVerse') &&
    hasString(r, 'color') &&
    hasNumber(r, 'createdAt') &&
    hasNumber(r, 'updatedAt')
  )
}

function validateBookmark(r: unknown): boolean {
  if (!isObject(r)) return false
  return (
    hasString(r, 'id') &&
    hasString(r, 'book') &&
    hasInteger(r, 'chapter') &&
    hasInteger(r, 'startVerse') &&
    hasInteger(r, 'endVerse') &&
    hasNumber(r, 'createdAt')
  )
}

function validateNote(r: unknown): boolean {
  if (!isObject(r)) return false
  return (
    hasString(r, 'id') &&
    hasString(r, 'book') &&
    hasInteger(r, 'chapter') &&
    hasInteger(r, 'startVerse') &&
    hasInteger(r, 'endVerse') &&
    hasString(r, 'body') &&
    hasNumber(r, 'createdAt') &&
    hasNumber(r, 'updatedAt')
  )
}

function validateJournal(r: unknown): boolean {
  if (!isObject(r)) return false
  return (
    hasString(r, 'id') &&
    hasString(r, 'body') &&
    hasNumber(r, 'createdAt') &&
    hasNumber(r, 'updatedAt')
  )
}

function validatePrayer(r: unknown): boolean {
  if (!isObject(r)) return false
  return (
    hasString(r, 'id') &&
    hasString(r, 'title') &&
    hasString(r, 'description') &&
    hasString(r, 'createdAt') &&
    hasString(r, 'updatedAt')
  )
}

function validateMeditation(r: unknown): boolean {
  if (!isObject(r)) return false
  return (
    hasString(r, 'id') &&
    hasString(r, 'type') &&
    hasString(r, 'date') &&
    hasNumber(r, 'durationMinutes') &&
    hasString(r, 'completedAt')
  )
}

const VALIDATORS: Record<(typeof DATA_KEYS)[number], (r: unknown) => boolean> = {
  highlights: validateHighlight,
  bookmarks: validateBookmark,
  notes: validateNote,
  prayers: validatePrayer,
  journals: validateJournal,
  meditations: validateMeditation,
}

export function validateExport(parsed: unknown): ValidationResult {
  if (!isObject(parsed)) {
    return { valid: false, error: ERROR_INVALID }
  }

  const { schemaVersion } = parsed

  // Schema version checks
  if (
    typeof schemaVersion !== 'number' ||
    !Number.isInteger(schemaVersion) ||
    schemaVersion <= 0
  ) {
    return { valid: false, error: ERROR_MISSING_DATA }
  }

  if (schemaVersion > CURRENT_SCHEMA_VERSION) {
    return { valid: false, error: ERROR_NEWER_VERSION }
  }

  // Envelope field checks
  if (!hasString(parsed, 'exportedAt') || !hasString(parsed, 'appVersion')) {
    return { valid: false, error: ERROR_MISSING_DATA }
  }

  const { data } = parsed
  if (!isObject(data)) {
    return { valid: false, error: ERROR_MISSING_DATA }
  }

  // All 6 data keys must be arrays
  for (const key of DATA_KEYS) {
    if (!Array.isArray(data[key])) {
      return { valid: false, error: ERROR_MISSING_DATA }
    }
  }

  // Per-record validation
  for (const key of DATA_KEYS) {
    const records = data[key] as unknown[]
    const validator = VALIDATORS[key]
    for (const record of records) {
      if (!validator(record)) {
        return { valid: false, error: ERROR_MISSING_DATA }
      }
    }
  }

  return { valid: true, export: parsed as unknown as BibleExportV1 }
}
