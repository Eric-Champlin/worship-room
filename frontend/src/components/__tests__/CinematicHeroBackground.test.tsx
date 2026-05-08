import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CinematicHeroBackground } from '@/components/CinematicHeroBackground'

describe('CinematicHeroBackground', () => {
  it('renders without crashing', () => {
    const { container } = render(<CinematicHeroBackground />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('outer wrapper has aria-hidden="true"', () => {
    const { container } = render(<CinematicHeroBackground />)
    const wrapper = container.querySelector('[data-testid="cinematic-hero-background"]')
    expect(wrapper).toHaveAttribute('aria-hidden', 'true')
  })

  it('outer wrapper has pointer-events-none class', () => {
    const { container } = render(<CinematicHeroBackground />)
    const wrapper = container.querySelector('[data-testid="cinematic-hero-background"]')
    expect(wrapper?.className).toContain('pointer-events-none')
  })

  it('outer wrapper height extends 200px past parent (calc(100% + 200px))', () => {
    const { container } = render(<CinematicHeroBackground />)
    const wrapper = container.querySelector<HTMLElement>('[data-testid="cinematic-hero-background"]')
    expect(wrapper?.style.height).toBe('calc(100% + 200px)')
  })

  it('outer wrapper applies mask-image linear gradient ending in transparent (seam-free composition)', () => {
    // The mask-image fade-to-transparent is the seam-free composition contract — it lets the
    // cinematic blend into BackgroundCanvas without a visible boundary. Component also sets
    // `WebkitMaskImage` for cross-browser support; jsdom normalizes vendor prefixes during style
    // serialization, so the -webkit- mirror is a real-browser / Playwright concern (covered there
    // by the data-testid + visual continuity) and cannot be unit-tested in jsdom.
    const { container } = render(<CinematicHeroBackground />)
    const wrapper = container.querySelector<HTMLElement>('[data-testid="cinematic-hero-background"]')
    expect(wrapper?.style.maskImage).toContain('linear-gradient')
    expect(wrapper?.style.maskImage).toContain('transparent 100%')
  })

  it('renders 8 atmospheric layers as direct children (3 div + 5 svg)', () => {
    // Source order:
    //   Layer 0 — solid base <div>
    //   Layer 1 — nebula tint <div>
    //   Layer 2 — far stars <svg>
    //   Layer 3 — mid stars <svg>
    //   Layer 4 — bright stars <svg>
    //   Layer 5 — cross-glints <svg>
    //   Layer 6 — warm beam <div>
    //   Layer 7 — film grain <svg>
    // Total: 3 div + 5 svg = 8 children. Plan body claimed "4 div + 4 svg" but the
    // warm beam at Layer 6 is a <div>, not an svg — verified empirically during Step 0.5.
    const { container } = render(<CinematicHeroBackground />)
    const wrapper = container.querySelector('[data-testid="cinematic-hero-background"]')
    const children = wrapper?.children
    expect(children?.length).toBe(8)
    let divCount = 0
    let svgCount = 0
    for (const child of Array.from(children ?? [])) {
      if (child.tagName === 'DIV') divCount++
      else if (child.tagName === 'svg' || child.tagName === 'SVG') svgCount++
    }
    expect(divCount).toBe(3)
    expect(svgCount).toBe(5)
  })

  it('animated CSS class hooks exist for reduced-motion contract (cinematic-light-beam, cinematic-star-twinkle, cinematic-glint-pulse)', () => {
    // jsdom does NOT evaluate `@media (prefers-reduced-motion: reduce)`, so this test
    // documents the reduced-motion CONTRACT by asserting that the animated class hooks
    // exist in the rendered DOM. The actual reduced-motion behavior (animations stopping)
    // is verified by /verify-with-playwright at the integration layer.
    const { container } = render(<CinematicHeroBackground />)
    const wrapper = container.querySelector('[data-testid="cinematic-hero-background"]')

    // Layer 6 (warm beam) always carries .cinematic-light-beam
    expect(wrapper?.querySelector('.cinematic-light-beam')).not.toBeNull()

    // Layers 3 (mid) + 4 (bright) carry .cinematic-star-twinkle on a deterministic subset
    // (twinkleRatio 0.3 mid / 0.5 bright via seeded RNG; ≥1 element guaranteed)
    const twinkles = wrapper?.querySelectorAll('.cinematic-star-twinkle')
    expect((twinkles?.length ?? 0)).toBeGreaterThan(0)

    // Layer 5 (cross-glints) carries .cinematic-glint-pulse on a deterministic subset
    // (pulse rate 0.3 across 8 anchors, seeded; ≥1 element guaranteed)
    const glints = wrapper?.querySelectorAll('.cinematic-glint-pulse')
    expect((glints?.length ?? 0)).toBeGreaterThan(0)
  })
})
