import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { HorizonGlow } from '../HorizonGlow'

describe('HorizonGlow', () => {
  it('renders exactly 5 glow spots', () => {
    const { container } = render(<HorizonGlow />)
    const wrapper = container.firstElementChild!
    const spots = wrapper.querySelectorAll('div')
    expect(spots.length).toBe(5)
  })

  it('container has aria-hidden="true"', () => {
    const { container } = render(<HorizonGlow />)
    const wrapper = container.firstElementChild!
    expect(wrapper.getAttribute('aria-hidden')).toBe('true')
  })

  it('container has pointer-events-none', () => {
    const { container } = render(<HorizonGlow />)
    const wrapper = container.firstElementChild!
    expect(wrapper.className).toContain('pointer-events-none')
  })

  it('glow spots positioned at strategic vertical percentages', () => {
    const { container } = render(<HorizonGlow />)
    const wrapper = container.firstElementChild!
    const spots = wrapper.querySelectorAll('div')
    const expectedTops = ['5%', '15%', '35%', '60%', '85%']
    spots.forEach((spot, i) => {
      expect((spot as HTMLElement).style.top).toBe(expectedTops[i])
    })
  })

  it('glow spots use radial-gradient backgrounds', () => {
    const { container } = render(<HorizonGlow />)
    const wrapper = container.firstElementChild!
    const spots = wrapper.querySelectorAll('div')
    spots.forEach((spot) => {
      expect((spot as HTMLElement).style.background).toContain('radial-gradient')
    })
  })

  it('glow spots use translate(-50%, -50%) centering', () => {
    const { container } = render(<HorizonGlow />)
    const wrapper = container.firstElementChild!
    const spots = wrapper.querySelectorAll('div')
    spots.forEach((spot) => {
      expect((spot as HTMLElement).style.transform).toContain('translate(-50%, -50%)')
    })
  })

  it('glow spots use blur filter', () => {
    const { container } = render(<HorizonGlow />)
    const wrapper = container.firstElementChild!
    const spots = wrapper.querySelectorAll('div')
    spots.forEach((spot) => {
      expect((spot as HTMLElement).style.filter).toContain('blur')
    })
  })
})
