import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReaderSettings } from '../useReaderSettings'

describe('useReaderSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns defaults when no localStorage', () => {
    const { result } = renderHook(() => useReaderSettings())
    expect(result.current.settings).toEqual({
      theme: 'midnight',
      typeSize: 'm',
      lineHeight: 'normal',
      fontFamily: 'serif',
      ambientAudioVisible: true,
      ambientAudioAutoStart: false,
      ambientAudioAutoStartSound: null,
      ambientAudioVolume: 35,
    })
  })

  it('reads from localStorage', () => {
    localStorage.setItem('wr_bible_reader_theme', 'sepia')
    localStorage.setItem('wr_bible_reader_type_size', 'xl')
    localStorage.setItem('wr_bible_reader_line_height', 'relaxed')
    localStorage.setItem('wr_bible_reader_font_family', 'sans')

    const { result } = renderHook(() => useReaderSettings())
    expect(result.current.settings).toEqual({
      theme: 'sepia',
      typeSize: 'xl',
      lineHeight: 'relaxed',
      fontFamily: 'sans',
      ambientAudioVisible: true,
      ambientAudioAutoStart: false,
      ambientAudioAutoStartSound: null,
      ambientAudioVolume: 35,
    })
  })

  it('updateSetting persists to localStorage', () => {
    const { result } = renderHook(() => useReaderSettings())
    act(() => {
      result.current.updateSetting('theme', 'parchment')
    })
    expect(result.current.settings.theme).toBe('parchment')
    expect(localStorage.getItem('wr_bible_reader_theme')).toBe('parchment')
  })

  it('resetToDefaults clears all 8 keys', () => {
    const { result } = renderHook(() => useReaderSettings())
    act(() => {
      result.current.updateSetting('theme', 'sepia')
      result.current.updateSetting('typeSize', 'xl')
      result.current.updateSetting('lineHeight', 'compact')
      result.current.updateSetting('fontFamily', 'sans')
      result.current.updateSetting('ambientAudioVisible', false)
      result.current.updateSetting('ambientAudioAutoStart', true)
      result.current.updateSetting('ambientAudioAutoStartSound', 'soft-piano')
      result.current.updateSetting('ambientAudioVolume', 80)
    })
    expect(result.current.settings.theme).toBe('sepia')
    expect(result.current.settings.ambientAudioAutoStart).toBe(true)

    act(() => {
      result.current.resetToDefaults()
    })
    expect(result.current.settings).toEqual({
      theme: 'midnight',
      typeSize: 'm',
      lineHeight: 'normal',
      fontFamily: 'serif',
      ambientAudioVisible: true,
      ambientAudioAutoStart: false,
      ambientAudioAutoStartSound: null,
      ambientAudioVolume: 35,
    })
    expect(localStorage.getItem('wr_bible_reader_theme')).toBeNull()
    expect(localStorage.getItem('wr_bible_reader_type_size')).toBeNull()
    expect(localStorage.getItem('wr_bible_reader_line_height')).toBeNull()
    expect(localStorage.getItem('wr_bible_reader_font_family')).toBeNull()
    expect(localStorage.getItem('wr_bible_reader_ambient_visible')).toBeNull()
    expect(localStorage.getItem('wr_bible_reader_ambient_autostart')).toBeNull()
    expect(localStorage.getItem('wr_bible_reader_ambient_autostart_sound')).toBeNull()
    expect(localStorage.getItem('wr_bible_reader_ambient_volume')).toBeNull()
  })

  it('invalid localStorage values fall back to defaults', () => {
    localStorage.setItem('wr_bible_reader_theme', 'garbage')
    localStorage.setItem('wr_bible_reader_type_size', '999')
    localStorage.setItem('wr_bible_reader_line_height', '')
    localStorage.setItem('wr_bible_reader_font_family', 'comic-sans')

    const { result } = renderHook(() => useReaderSettings())
    expect(result.current.settings).toEqual({
      theme: 'midnight',
      typeSize: 'm',
      lineHeight: 'normal',
      fontFamily: 'serif',
      ambientAudioVisible: true,
      ambientAudioAutoStart: false,
      ambientAudioAutoStartSound: null,
      ambientAudioVolume: 35,
    })
  })

  // --- Ambient audio boolean fields ---

  it('reads ambientAudioVisible default as true', () => {
    const { result } = renderHook(() => useReaderSettings())
    expect(result.current.settings.ambientAudioVisible).toBe(true)
  })

  it('reads ambientAudioVisible from localStorage', () => {
    localStorage.setItem('wr_bible_reader_ambient_visible', 'false')
    const { result } = renderHook(() => useReaderSettings())
    expect(result.current.settings.ambientAudioVisible).toBe(false)
  })

  it('reads ambientAudioAutoStart default as false', () => {
    const { result } = renderHook(() => useReaderSettings())
    expect(result.current.settings.ambientAudioAutoStart).toBe(false)
  })

  // --- Nullable string field ---

  it('reads ambientAudioAutoStartSound default as null', () => {
    const { result } = renderHook(() => useReaderSettings())
    expect(result.current.settings.ambientAudioAutoStartSound).toBeNull()
  })

  it('reads ambientAudioAutoStartSound from localStorage', () => {
    localStorage.setItem('wr_bible_reader_ambient_autostart_sound', 'soft-piano')
    const { result } = renderHook(() => useReaderSettings())
    expect(result.current.settings.ambientAudioAutoStartSound).toBe('soft-piano')
  })

  // --- Number field ---

  it('reads ambientAudioVolume default as 35', () => {
    const { result } = renderHook(() => useReaderSettings())
    expect(result.current.settings.ambientAudioVolume).toBe(35)
  })

  it('reads ambientAudioVolume from localStorage', () => {
    localStorage.setItem('wr_bible_reader_ambient_volume', '50')
    const { result } = renderHook(() => useReaderSettings())
    expect(result.current.settings.ambientAudioVolume).toBe(50)
  })

  it('clamps ambientAudioVolume to 0-100', () => {
    localStorage.setItem('wr_bible_reader_ambient_volume', '150')
    const { result: r1 } = renderHook(() => useReaderSettings())
    expect(r1.current.settings.ambientAudioVolume).toBe(100)

    localStorage.setItem('wr_bible_reader_ambient_volume', '-5')
    const { result: r2 } = renderHook(() => useReaderSettings())
    expect(r2.current.settings.ambientAudioVolume).toBe(0)
  })

  // --- updateSetting for new field types ---

  it('updateSetting writes boolean to localStorage', () => {
    const { result } = renderHook(() => useReaderSettings())
    act(() => {
      result.current.updateSetting('ambientAudioAutoStart', true)
    })
    expect(result.current.settings.ambientAudioAutoStart).toBe(true)
    expect(localStorage.getItem('wr_bible_reader_ambient_autostart')).toBe('true')
  })

  it('updateSetting removes null sound from localStorage', () => {
    const { result } = renderHook(() => useReaderSettings())
    act(() => {
      result.current.updateSetting('ambientAudioAutoStartSound', 'ocean-waves')
    })
    expect(localStorage.getItem('wr_bible_reader_ambient_autostart_sound')).toBe('ocean-waves')

    act(() => {
      result.current.updateSetting('ambientAudioAutoStartSound', null)
    })
    expect(result.current.settings.ambientAudioAutoStartSound).toBeNull()
    expect(localStorage.getItem('wr_bible_reader_ambient_autostart_sound')).toBeNull()
  })
})
