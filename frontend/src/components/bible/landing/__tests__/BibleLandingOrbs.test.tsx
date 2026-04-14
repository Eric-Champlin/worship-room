import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BibleLandingOrbs } from '../BibleLandingOrbs'

describe('BibleLandingOrbs', () => {
  it('renders 3 glow orbs', () => {
    const { container } = render(<BibleLandingOrbs />)
    const orbs = container.querySelectorAll('.will-change-transform')
    expect(orbs).toHaveLength(3)
  })

  it('orbs are aria-hidden', () => {
    const { container } = render(<BibleLandingOrbs />)
    const wrapper = container.firstElementChild
    expect(wrapper?.getAttribute('aria-hidden')).toBe('true')
  })

  it('orbs use two-stop radial gradient', () => {
    const { container } = render(<BibleLandingOrbs />)
    const orbs = container.querySelectorAll('.will-change-transform')
    orbs.forEach((orb) => {
      const style = (orb as HTMLElement).style.background
      expect(style).toContain('radial-gradient')
      // Two opacity stops before transparent
      expect(style).toContain('0%')
      expect(style).toContain('40%')
      expect(style).toContain('70%')
    })
  })
})
