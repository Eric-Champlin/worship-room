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

  it('resetToDefaults clears all 4 keys', () => {
    const { result } = renderHook(() => useReaderSettings())
    act(() => {
      result.current.updateSetting('theme', 'sepia')
      result.current.updateSetting('typeSize', 'xl')
      result.current.updateSetting('lineHeight', 'compact')
      result.current.updateSetting('fontFamily', 'sans')
    })
    expect(result.current.settings.theme).toBe('sepia')

    act(() => {
      result.current.resetToDefaults()
    })
    expect(result.current.settings).toEqual({
      theme: 'midnight',
      typeSize: 'm',
      lineHeight: 'normal',
      fontFamily: 'serif',
    })
    expect(localStorage.getItem('wr_bible_reader_theme')).toBeNull()
    expect(localStorage.getItem('wr_bible_reader_type_size')).toBeNull()
    expect(localStorage.getItem('wr_bible_reader_line_height')).toBeNull()
    expect(localStorage.getItem('wr_bible_reader_font_family')).toBeNull()
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
    })
  })
})
