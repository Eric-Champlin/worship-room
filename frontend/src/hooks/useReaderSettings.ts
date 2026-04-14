import { useState, useCallback } from 'react'

export interface ReaderSettings {
  theme: 'midnight' | 'parchment' | 'sepia'
  typeSize: 's' | 'm' | 'l' | 'xl'
  lineHeight: 'compact' | 'normal' | 'relaxed'
  fontFamily: 'serif' | 'sans'
  ambientAudioVisible: boolean
  ambientAudioAutoStart: boolean
  ambientAudioAutoStartSound: string | null
  ambientAudioVolume: number
}

const DEFAULTS: ReaderSettings = {
  theme: 'midnight',
  typeSize: 'm',
  lineHeight: 'normal',
  fontFamily: 'serif',
  ambientAudioVisible: true,
  ambientAudioAutoStart: false,
  ambientAudioAutoStartSound: null,
  ambientAudioVolume: 35,
}

const KEYS: Record<keyof ReaderSettings, string> = {
  theme: 'wr_bible_reader_theme',
  typeSize: 'wr_bible_reader_type_size',
  lineHeight: 'wr_bible_reader_line_height',
  fontFamily: 'wr_bible_reader_font_family',
  ambientAudioVisible: 'wr_bible_reader_ambient_visible',
  ambientAudioAutoStart: 'wr_bible_reader_ambient_autostart',
  ambientAudioAutoStartSound: 'wr_bible_reader_ambient_autostart_sound',
  ambientAudioVolume: 'wr_bible_reader_ambient_volume',
}

const VALID_VALUES: Partial<Record<keyof ReaderSettings, readonly string[]>> = {
  theme: ['midnight', 'parchment', 'sepia'],
  typeSize: ['s', 'm', 'l', 'xl'],
  lineHeight: ['compact', 'normal', 'relaxed'],
  fontFamily: ['serif', 'sans'],
}

const BOOLEAN_FIELDS: ReadonlySet<keyof ReaderSettings> = new Set([
  'ambientAudioVisible',
  'ambientAudioAutoStart',
])

const NULLABLE_STRING_FIELDS: ReadonlySet<keyof ReaderSettings> = new Set([
  'ambientAudioAutoStartSound',
])

const NUMBER_FIELDS: ReadonlySet<keyof ReaderSettings> = new Set([
  'ambientAudioVolume',
])

export const TYPE_SIZE_CLASSES: Record<ReaderSettings['typeSize'], string> = {
  s: 'text-base',
  m: 'text-lg',
  l: 'text-xl',
  xl: 'text-2xl',
}

export const LINE_HEIGHT_CLASSES: Record<ReaderSettings['lineHeight'], string> = {
  compact: 'leading-snug',
  normal: 'leading-[1.8]',
  relaxed: 'leading-loose',
}

export const FONT_FAMILY_CLASSES: Record<ReaderSettings['fontFamily'], string> = {
  serif: 'font-serif',
  sans: 'font-sans',
}

function readSetting<K extends keyof ReaderSettings>(key: K): ReaderSettings[K] {
  try {
    const stored = localStorage.getItem(KEYS[key])

    // Boolean fields
    if (BOOLEAN_FIELDS.has(key)) {
      if (stored === 'true') return true as ReaderSettings[K]
      if (stored === 'false') return false as ReaderSettings[K]
      return DEFAULTS[key]
    }

    // Nullable string fields
    if (NULLABLE_STRING_FIELDS.has(key)) {
      if (stored) return stored as ReaderSettings[K]
      return null as ReaderSettings[K]
    }

    // Number fields (clamp 0-100)
    if (NUMBER_FIELDS.has(key)) {
      if (stored !== null) {
        const parsed = parseInt(stored, 10)
        if (!isNaN(parsed)) {
          return Math.max(0, Math.min(100, parsed)) as ReaderSettings[K]
        }
      }
      return DEFAULTS[key]
    }

    // String-enum fields (original behavior)
    const validValues = VALID_VALUES[key]
    if (stored && validValues && (validValues as readonly string[]).includes(stored)) {
      return stored as ReaderSettings[K]
    }
  } catch {
    // localStorage unavailable
  }
  return DEFAULTS[key]
}

export function useReaderSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(() => ({
    theme: readSetting('theme'),
    typeSize: readSetting('typeSize'),
    lineHeight: readSetting('lineHeight'),
    fontFamily: readSetting('fontFamily'),
    ambientAudioVisible: readSetting('ambientAudioVisible'),
    ambientAudioAutoStart: readSetting('ambientAudioAutoStart'),
    ambientAudioAutoStartSound: readSetting('ambientAudioAutoStartSound'),
    ambientAudioVolume: readSetting('ambientAudioVolume'),
  }))

  const updateSetting = useCallback(
    <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
      try {
        if (value === null) {
          localStorage.removeItem(KEYS[key])
        } else {
          localStorage.setItem(KEYS[key], String(value))
        }
      } catch {
        // localStorage unavailable
      }
      setSettings((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const resetToDefaults = useCallback(() => {
    for (const key of Object.keys(KEYS) as Array<keyof typeof KEYS>) {
      try {
        localStorage.removeItem(KEYS[key])
      } catch {
        // localStorage unavailable
      }
    }
    setSettings(DEFAULTS)
  }, [])

  return { settings, updateSetting, resetToDefaults }
}
