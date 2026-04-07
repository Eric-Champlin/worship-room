import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StarField } from '../StarField'

describe('StarField', () => {
  it('renders ~110 star dots', () => {
    const { container } = render(<StarField />)
    const wrapper = container.firstElementChild!
    const stars = wrapper.querySelectorAll('div')
    expect(stars.length).toBeGreaterThanOrEqual(100)
    expect(stars.length).toBeLessThanOrEqual(120)
  })

  it('container has aria-hidden="true"', () => {
    const { container } = render(<StarField />)
    const wrapper = container.firstElementChild!
    expect(wrapper.getAttribute('aria-hidden')).toBe('true')
  })

  it('container has pointer-events-none', () => {
    const { container } = render(<StarField />)
    const wrapper = container.firstElementChild!
    expect(wrapper.className).toContain('pointer-events-none')
  })

  it('stars have bg-white class', () => {
    const { container } = render(<StarField />)
    const wrapper = container.firstElementChild!
    const stars = wrapper.querySelectorAll('div')
    stars.forEach((star) => {
      expect(star.className).toContain('bg-white')
    })
  })

  it('stars have rounded-full class', () => {
    const { container } = render(<StarField />)
    const wrapper = container.firstElementChild!
    const stars = wrapper.querySelectorAll('div')
    stars.forEach((star) => {
      expect(star.className).toContain('rounded-full')
    })
  })

  it('stars use percentage positioning', () => {
    const { container } = render(<StarField />)
    const wrapper = container.firstElementChild!
    const stars = wrapper.querySelectorAll('div')
    stars.forEach((star) => {
      const style = (star as HTMLElement).style
      expect(style.top).toMatch(/%$/)
      expect(style.left).toMatch(/%$/)
    })
  })

  it('no star has opacity below 0.3 or above 0.55', () => {
    const { container } = render(<StarField />)
    const wrapper = container.firstElementChild!
    const stars = wrapper.querySelectorAll('div')
    stars.forEach((star) => {
      const opacity = parseFloat((star as HTMLElement).style.opacity)
      expect(opacity).toBeGreaterThanOrEqual(0.3)
      expect(opacity).toBeLessThanOrEqual(0.55)
    })
  })
})
