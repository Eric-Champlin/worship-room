import { describe, it, expect } from 'vitest'
import {
  getInitials,
  getInitialsColor,
  ACCEPTED_IMAGE_TYPES,
  MAX_PHOTO_SIZE_BYTES,
  processAvatarPhoto,
} from '../avatar-utils'

describe('getInitials', () => {
  it('returns first letter for single word name', () => {
    expect(getInitials('Sarah')).toBe('S')
  })

  it('returns two initials for multi-word name', () => {
    expect(getInitials('Sarah M.')).toBe('SM')
    expect(getInitials('John David Smith')).toBe('JD')
  })

  it('returns "?" for empty string', () => {
    expect(getInitials('')).toBe('?')
    expect(getInitials('   ')).toBe('?')
  })

  it('handles lowercase input', () => {
    expect(getInitials('sarah miller')).toBe('SM')
  })

  it('handles extra whitespace', () => {
    expect(getInitials('  Sarah   Miller  ')).toBe('SM')
  })
})

describe('getInitialsColor', () => {
  it('returns a hex color string', () => {
    const color = getInitialsColor('user-123')
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  it('is deterministic — same userId gives same color', () => {
    const color1 = getInitialsColor('user-abc')
    const color2 = getInitialsColor('user-abc')
    expect(color1).toBe(color2)
  })

  it('produces varied colors for different userIds', () => {
    const colors = new Set(
      ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7', 'user-8'].map(
        getInitialsColor,
      ),
    )
    expect(colors.size).toBeGreaterThan(1)
  })

  it('uses spec colors (includes #C026D3 fuchsia)', () => {
    // Generate many colors to verify we hit the expected palette
    const allColors = new Set<string>()
    for (let i = 0; i < 100; i++) {
      allColors.add(getInitialsColor(`test-user-${i}`))
    }
    // All returned colors should be from the palette
    const palette = new Set([
      '#6D28D9', '#2563EB', '#059669', '#D97706',
      '#DC2626', '#0891B2', '#7C3AED', '#C026D3',
    ])
    for (const color of allColors) {
      expect(palette.has(color)).toBe(true)
    }
  })
})

describe('processAvatarPhoto', () => {
  it('rejects files larger than 2MB', async () => {
    const file = new File(['x'.repeat(MAX_PHOTO_SIZE_BYTES + 1)], 'big.jpg', {
      type: 'image/jpeg',
    })
    await expect(processAvatarPhoto(file)).rejects.toThrow('Photo must be under 2MB')
  })

  it('rejects invalid file types', async () => {
    const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' })
    await expect(processAvatarPhoto(file)).rejects.toThrow('JPEG, PNG, or WebP')
  })

  it('accepts JPEG, PNG, and WebP types', () => {
    expect(ACCEPTED_IMAGE_TYPES).toContain('image/jpeg')
    expect(ACCEPTED_IMAGE_TYPES).toContain('image/png')
    expect(ACCEPTED_IMAGE_TYPES).toContain('image/webp')
  })

  it('has max size of 2MB', () => {
    expect(MAX_PHOTO_SIZE_BYTES).toBe(2 * 1024 * 1024)
  })
})
