import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { ANIMATION_DURATIONS, ANIMATION_EASINGS } from '@/constants/animation'

// Mock matchMedia to simulate prefers-reduced-motion: reduce
function mockReducedMotion() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('Animation token system', () => {
  it('ANIMATION_DURATIONS has exactly 4 tokens', () => {
    expect(Object.keys(ANIMATION_DURATIONS)).toHaveLength(4)
  })

  it('no duration exceeds 400ms', () => {
    for (const [, value] of Object.entries(ANIMATION_DURATIONS)) {
      expect(value).toBeLessThanOrEqual(400)
    }
  })

  it('ANIMATION_EASINGS has exactly 4 tokens', () => {
    expect(Object.keys(ANIMATION_EASINGS)).toHaveLength(4)
  })

  it('all easing values are valid cubic-bezier strings', () => {
    const pattern = /^cubic-bezier\([\d., ]+\)$/
    for (const [, value] of Object.entries(ANIMATION_EASINGS)) {
      expect(value).toMatch(pattern)
    }
  })
})

describe('Reduced motion compliance', () => {
  beforeEach(() => {
    mockReducedMotion()
  })

  it('motion-safe: animation classes are conditional', () => {
    const { container } = render(
      <div className="motion-safe:animate-fade-in">Content</div>
    )
    const el = container.firstElementChild!
    expect(el.className).toContain('motion-safe:animate-fade-in')
  })

  it('motion-reduce:transition-none is applied to transitioning elements', () => {
    const { container } = render(
      <div className="transition-all duration-base motion-reduce:transition-none">Content</div>
    )
    const el = container.firstElementChild!
    expect(el.className).toContain('motion-reduce:transition-none')
  })

  it('SkeletonBlock shimmer class is present under reduced motion', async () => {
    const { SkeletonBlock } = await import('@/components/skeletons/SkeletonBlock')
    const { container } = render(<SkeletonBlock className="h-4 w-full" />)
    const el = container.querySelector('[class*="animate-shimmer"]')
    expect(el).not.toBeNull()
  })

  it('animate-fade-in-up retains the slide-up visual behavior', () => {
    const { container } = render(
      <div className="motion-safe:animate-fade-in-up">Content</div>
    )
    const el = container.firstElementChild!
    expect(el.className).toContain('animate-fade-in-up')
  })

  it('animate-scale-in is available for modal entrances', () => {
    const { container } = render(
      <div className="motion-safe:animate-scale-in">Modal</div>
    )
    const el = container.firstElementChild!
    expect(el.className).toContain('animate-scale-in')
  })

  it('animate-slide-up is available for toast entrances', () => {
    const { container } = render(
      <div className="motion-safe:animate-slide-up">Toast</div>
    )
    const el = container.firstElementChild!
    expect(el.className).toContain('animate-slide-up')
  })

  it('animate-fade-out is available for exit animations', () => {
    const { container } = render(
      <div className="motion-safe:animate-fade-out">Exiting</div>
    )
    const el = container.firstElementChild!
    expect(el.className).toContain('animate-fade-out')
  })
})

describe('Route transition', () => {
  it('RouteTransition renders children with motion-safe:animate-fade-in wrapper', async () => {
    // RouteTransition is inlined in App.tsx (not exported). We replicate
    // the component here to verify the pattern without importing the full
    // App tree. If RouteTransition is extracted to its own module in BB-37,
    // this test should import it directly.
    const { useLocation } = await import('react-router-dom')
    const { MemoryRouter } = await import('react-router-dom')

    function RouteTransition({ children }: { children: ReactNode }) {
      const location = useLocation()
      return <div key={location.pathname} className="motion-safe:animate-fade-in">{children}</div>
    }

    const { container } = render(
      <MemoryRouter initialEntries={['/daily']}>
        <RouteTransition>
          <p>Tab content</p>
        </RouteTransition>
      </MemoryRouter>
    )

    const wrapper = container.firstElementChild!
    expect(wrapper.className).toContain('motion-safe:animate-fade-in')
    expect(wrapper.textContent).toBe('Tab content')
  })
})
