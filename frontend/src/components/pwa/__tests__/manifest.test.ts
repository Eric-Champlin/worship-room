import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const manifestPath = resolve(__dirname, '../../../../public/manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))

describe('manifest.json', () => {
  it('has all required fields', () => {
    const requiredFields = [
      'name',
      'short_name',
      'description',
      'start_url',
      'display',
      'background_color',
      'theme_color',
      'orientation',
    ]
    for (const field of requiredFields) {
      expect(manifest).toHaveProperty(field)
    }
  })

  it('has correct name and short_name', () => {
    expect(manifest.name).toBe('Worship Room')
    expect(manifest.short_name).toBe('Worship Room')
  })

  it('has correct start_url and display', () => {
    expect(manifest.start_url).toBe('/')
    expect(manifest.display).toBe('standalone')
  })

  it('has correct colors matching spec', () => {
    expect(manifest.background_color).toBe('#0f0a1e')
    expect(manifest.theme_color).toBe('#6D28D9')
  })

  it('has icons with correct sizes', () => {
    expect(manifest.icons).toBeInstanceOf(Array)
    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
  })

  it('has icon paths starting with /', () => {
    for (const icon of manifest.icons) {
      expect(icon.src).toMatch(/^\//)
    }
  })

  it('has apple-touch-icon entry', () => {
    const appleIcon = manifest.icons.find(
      (icon: { sizes: string }) => icon.sizes === '180x180'
    )
    expect(appleIcon).toBeDefined()
    expect(appleIcon.src).toBe('/apple-touch-icon.png')
  })
})
