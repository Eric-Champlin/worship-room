import { useState, useCallback } from 'react'

export interface ReaderSettings {
  theme: 'midnight' | 'parchment' | 'sepia'
  typeSize: 's' | 'm' | 'l' | 'xl'
  lineHeight: 'compact' | 'normal' | 'relaxed'
  fontFamily: 'serif' | 'sans'
}

const DEFAULTS: ReaderSettings = {
  theme: 'midnight',
  typeSize: 'm',
  lineHeight: 'normal',
  fontFamily: 'serif',
}

const KEYS = {
  theme: 'wr_bible_reader_theme',
  typeSize: 'wr_bible_reader_type_size',
  lineHeight: 'wr_bible_reader_line_height',
  fontFamily: 'wr_bible_reader_font_family',
} as const

const VALID_VALUES: Record<keyof ReaderSettings, readonly string[]> = {
  theme: ['midnight', 'parchment', 'sepia'],
  typeSize: ['s', 'm', 'l', 'xl'],
  lineHeight: ['compact', 'normal', 'relaxed'],
  fontFamily: ['serif', 'sans'],
}

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
    if (stored && (VALID_VALUES[key] as readonly string[]).includes(stored)) {
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
  }))

  const updateSetting = useCallback(
    <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
      try {
        localStorage.setItem(KEYS[key], value)
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
