import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { GlowBackground } from '../GlowBackground'

describe('GlowBackground', () => {
  it('renders children', () => {
    render(
      <GlowBackground>
        <p>Test content</p>
      </GlowBackground>
    )
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders with relative and bg-hero-bg', () => {
    const { container } = render(
      <GlowBackground>
        <p>Content</p>
      </GlowBackground>
    )
    const outer = container.firstElementChild as HTMLElement
    expect(outer.className).toContain('relative')
    expect(outer.className).toContain('bg-hero-bg')
  })

  it('variant="center" renders two glow orbs', () => {
    render(
      <GlowBackground variant="center">
        <p>Content</p>
      </GlowBackground>
    )
    const orbs = screen.getAllByTestId('glow-orb')
    expect(orbs).toHaveLength(2)
  })

  it('variant="split" renders three glow orbs', () => {
    render(
      <GlowBackground variant="split">
        <p>Content</p>
      </GlowBackground>
    )
    const orbs = screen.getAllByTestId('glow-orb')
    expect(orbs).toHaveLength(3)
  })

  it('variant="none" renders no glow orbs', () => {
    render(
      <GlowBackground variant="none">
        <p>Content</p>
      </GlowBackground>
    )
    expect(screen.queryByTestId('glow-orb')).not.toBeInTheDocument()
  })

  it('children have z-10 wrapper', () => {
    render(
      <GlowBackground>
        <p>Content</p>
      </GlowBackground>
    )
    const content = screen.getByText('Content')
    const wrapper = content.parentElement as HTMLElement
    expect(wrapper.className).toContain('z-10')
  })

  it('applies bg-hero-bg', () => {
    const { container } = render(
      <GlowBackground>
        <p>Content</p>
      </GlowBackground>
    )
    const outer = container.firstElementChild as HTMLElement
    expect(outer.className).toContain('bg-hero-bg')
  })

  it('accepts className prop', () => {
    const { container } = render(
      <GlowBackground className="custom-class">
        <p>Content</p>
      </GlowBackground>
    )
    const outer = container.firstElementChild as HTMLElement
    expect(outer.className).toContain('custom-class')
  })

  it('center variant primary orb has 0.25 opacity', () => {
    render(
      <GlowBackground variant="center">
        <p>Content</p>
      </GlowBackground>
    )
    const orbs = screen.getAllByTestId('glow-orb')
    expect(orbs[0].style.background).toContain('rgba(139, 92, 246, 0.25)')
  })

  it('left variant primary orb has 0.22 opacity', () => {
    render(
      <GlowBackground variant="left">
        <p>Content</p>
      </GlowBackground>
    )
    const orbs = screen.getAllByTestId('glow-orb')
    expect(orbs[0].style.background).toContain('rgba(139, 92, 246, 0.22)')
  })

  it('right variant primary orb has 0.22 opacity', () => {
    render(
      <GlowBackground variant="right">
        <p>Content</p>
      </GlowBackground>
    )
    const orbs = screen.getAllByTestId('glow-orb')
    expect(orbs[0].style.background).toContain('rgba(139, 92, 246, 0.22)')
  })

  it('split variant orbs have 0.24, 0.18, and 0.14 opacities', () => {
    render(
      <GlowBackground variant="split">
        <p>Content</p>
      </GlowBackground>
    )
    const orbs = screen.getAllByTestId('glow-orb')
    expect(orbs[0].style.background).toContain('0.24')
    expect(orbs[1].style.background).toContain('0.18')
    expect(orbs[2].style.background).toContain('0.14')
  })

  it('orbs have pointer-events-none', () => {
    render(
      <GlowBackground variant="center">
        <p>Content</p>
      </GlowBackground>
    )
    const orbs = screen.getAllByTestId('glow-orb')
    orbs.forEach((orb) => expect(orb.className).toContain('pointer-events-none'))
  })

  it('orbs have will-change-transform', () => {
    render(
      <GlowBackground variant="center">
        <p>Content</p>
      </GlowBackground>
    )
    const orbs = screen.getAllByTestId('glow-orb')
    orbs.forEach((orb) => expect(orb.className).toContain('will-change-transform'))
  })

  it('orbs have blur class', () => {
    render(
      <GlowBackground variant="center">
        <p>Content</p>
      </GlowBackground>
    )
    const orbs = screen.getAllByTestId('glow-orb')
    orbs.forEach((orb) => expect(orb.className).toContain('blur-'))
  })

  it('uses overflow-clip to contain glow orbs within viewport', () => {
    const { container } = render(
      <GlowBackground>
        <p>Content</p>
      </GlowBackground>
    )
    const outer = container.firstElementChild as HTMLElement
    expect(outer.className).toContain('overflow-clip')
    expect(outer.className).not.toContain('overflow-hidden')
  })

  it('glowOpacity prop overrides default opacity', () => {
    render(
      <GlowBackground variant="center" glowOpacity={0.30}>
        <p>Content</p>
      </GlowBackground>
    )
    const orbs = screen.getAllByTestId('glow-orb')
    expect(orbs[0].style.background).toContain('rgba(139, 92, 246, 0.3)')
  })
})
