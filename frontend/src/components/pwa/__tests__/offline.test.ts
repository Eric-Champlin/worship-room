import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const offlinePath = resolve(__dirname, '../../../../public/offline.html')
const html = readFileSync(offlinePath, 'utf-8')

describe('offline.html', () => {
  it('has no external stylesheets', () => {
    expect(html).not.toMatch(/<link\s+rel=["']stylesheet["']/)
  })

  it('has no external scripts', () => {
    expect(html).not.toMatch(/<script\s+src=/)
  })

  it('has correct background color', () => {
    expect(html).toContain('#0f0a1e')
  })

  it('uses system font stack', () => {
    expect(html).toContain('-apple-system')
  })

  it('has correct message text', () => {
    expect(html).toContain(
      "You're offline right now. Some features need an internet connection, but your saved content is still available."
    )
  })

  it('has Try again button with location.reload()', () => {
    expect(html).toContain('location.reload()')
    expect(html).toContain('Try again')
  })

  it('has accessible touch target (min-height 44px)', () => {
    expect(html).toContain('min-height: 44px')
  })

  it('has DOCTYPE and lang attribute', () => {
    expect(html).toMatch(/<!DOCTYPE html>/i)
    expect(html).toContain('lang="en"')
  })

  it('has no url() references in CSS', () => {
    // Extract style block and check for url() — indicates external dependency
    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/)
    if (styleMatch) {
      expect(styleMatch[1]).not.toMatch(/url\s*\(/)
    }
  })
})
