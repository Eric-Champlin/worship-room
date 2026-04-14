import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { FocusVignette } from '../FocusVignette'

describe('FocusVignette', () => {
  it('renders two gradient divs with aria-hidden', () => {
    const { container } = render(
      <FocusVignette visible={true} reducedMotion={false} />,
    )

    const divs = container.querySelectorAll('[aria-hidden="true"]')
    expect(divs).toHaveLength(2)
  })

  it('applies opacity 0 when not visible', () => {
    const { container } = render(
      <FocusVignette visible={false} reducedMotion={false} />,
    )

    const divs = container.querySelectorAll('[aria-hidden="true"]')
    divs.forEach((div) => {
      expect((div as HTMLElement).style.opacity).toBe('0')
    })
  })

  it('applies opacity 1 when visible', () => {
    const { container } = render(
      <FocusVignette visible={true} reducedMotion={false} />,
    )

    const divs = container.querySelectorAll('[aria-hidden="true"]')
    divs.forEach((div) => {
      expect((div as HTMLElement).style.opacity).toBe('1')
    })
  })

  it('has pointer-events none always', () => {
    const { container } = render(
      <FocusVignette visible={true} reducedMotion={false} />,
    )

    const divs = container.querySelectorAll('[aria-hidden="true"]')
    divs.forEach((div) => {
      expect(div.className).toContain('pointer-events-none')
    })

    // Also check when not visible
    const { container: c2 } = render(
      <FocusVignette visible={false} reducedMotion={false} />,
    )

    const divs2 = c2.querySelectorAll('[aria-hidden="true"]')
    divs2.forEach((div) => {
      expect(div.className).toContain('pointer-events-none')
    })
  })

  it('uses 0ms transition when reducedMotion is true', () => {
    const { container } = render(
      <FocusVignette visible={true} reducedMotion={true} />,
    )

    const divs = container.querySelectorAll('[aria-hidden="true"]')
    divs.forEach((div) => {
      expect((div as HTMLElement).style.transition).toContain('0ms')
    })
  })
})
