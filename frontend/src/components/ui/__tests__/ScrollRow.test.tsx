import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ScrollRow } from '../ScrollRow'

function TileStrip({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} data-testid={`tile-${i}`} style={{ width: 100 }}>
          Tile {i}
        </div>
      ))}
    </>
  )
}

/**
 * Set the scroll metrics of the internal scroller element (first child of role=region)
 * and fire a scroll event so the ScrollRow recomputes fade state.
 */
function setScrollerMetrics(
  region: HTMLElement,
  metrics: { scrollLeft?: number; scrollWidth?: number; clientWidth?: number },
) {
  const scroller = region.firstElementChild as HTMLElement
  if (metrics.scrollWidth !== undefined) {
    Object.defineProperty(scroller, 'scrollWidth', {
      value: metrics.scrollWidth,
      configurable: true,
    })
  }
  if (metrics.clientWidth !== undefined) {
    Object.defineProperty(scroller, 'clientWidth', {
      value: metrics.clientWidth,
      configurable: true,
    })
  }
  if (metrics.scrollLeft !== undefined) {
    scroller.scrollLeft = metrics.scrollLeft
  }
  fireEvent.scroll(scroller)
  return scroller
}

describe('ScrollRow', () => {
  let originalMatchMedia: typeof window.matchMedia

  beforeEach(() => {
    originalMatchMedia = window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as typeof window.matchMedia
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('renders children inside a horizontally scrollable container', () => {
    render(
      <ScrollRow ariaLabel="Test row" itemCount={3}>
        <TileStrip count={3} />
      </ScrollRow>,
    )
    expect(screen.getByTestId('tile-0')).toBeInTheDocument()
    expect(screen.getByTestId('tile-2')).toBeInTheDocument()
    const region = screen.getByRole('region', { name: 'Test row' })
    const scroller = region.firstElementChild as HTMLElement
    expect(scroller.className).toContain('overflow-x-auto')
  })

  it('propagates role=region and aria-label', () => {
    render(
      <ScrollRow ariaLabel="Nature sounds" itemCount={3}>
        <TileStrip count={3} />
      </ScrollRow>,
    )
    expect(screen.getByRole('region', { name: 'Nature sounds' })).toBeInTheDocument()
  })

  it('hides right-edge fade when content fits', () => {
    const { container } = render(
      <ScrollRow ariaLabel="Fits" itemCount={3}>
        <TileStrip count={3} />
      </ScrollRow>,
    )
    const region = screen.getByRole('region', { name: 'Fits' })
    setScrollerMetrics(region, { scrollLeft: 0, scrollWidth: 300, clientWidth: 300 })
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
  })

  it('shows right-edge fade when content overflows', () => {
    render(
      <ScrollRow ariaLabel="Overflow" itemCount={10}>
        <TileStrip count={10} />
      </ScrollRow>,
    )
    const region = screen.getByRole('region', { name: 'Overflow' })
    act(() => {
      setScrollerMetrics(region, { scrollLeft: 0, scrollWidth: 1000, clientWidth: 300 })
    })
    const fades = region.querySelectorAll('[aria-hidden="true"]')
    expect(fades.length).toBeGreaterThanOrEqual(1)
    // The right fade gradient points from right edge
    const rightFade = Array.from(fades).find((el) =>
      el.className.includes('right-0'),
    ) as HTMLElement
    expect(rightFade).toBeTruthy()
    expect(rightFade.className).toContain('bg-gradient-to-l')
    expect(rightFade.className).toContain('from-hero-bg')
  })

  it('hides left-edge fade until user scrolls right', () => {
    render(
      <ScrollRow ariaLabel="ScrollLeft" itemCount={10}>
        <TileStrip count={10} />
      </ScrollRow>,
    )
    const region = screen.getByRole('region', { name: 'ScrollLeft' })
    act(() => {
      setScrollerMetrics(region, { scrollLeft: 0, scrollWidth: 1000, clientWidth: 300 })
    })
    // Initially no left fade
    expect(region.querySelector('.left-0')).toBeNull()
    act(() => {
      setScrollerMetrics(region, { scrollLeft: 50 })
    })
    const leftFade = region.querySelector('.left-0') as HTMLElement
    expect(leftFade).toBeTruthy()
    expect(leftFade.className).toContain('bg-gradient-to-r')
    expect(leftFade.className).toContain('from-hero-bg')
  })

  it('hides "See more" affordance when itemCount <= threshold', () => {
    render(
      <ScrollRow ariaLabel="NoAffordance" itemCount={6} overflowThreshold={6}>
        <TileStrip count={6} />
      </ScrollRow>,
    )
    const region = screen.getByRole('region', { name: 'NoAffordance' })
    act(() => {
      setScrollerMetrics(region, { scrollLeft: 0, scrollWidth: 1000, clientWidth: 300 })
    })
    expect(screen.queryByRole('button', { name: /see more/i })).not.toBeInTheDocument()
  })

  it('shows "See more" affordance when itemCount > threshold AND content overflows', () => {
    render(
      <ScrollRow ariaLabel="Affordance" itemCount={7} overflowThreshold={6}>
        <TileStrip count={7} />
      </ScrollRow>,
    )
    const region = screen.getByRole('region', { name: 'Affordance' })
    act(() => {
      setScrollerMetrics(region, { scrollLeft: 0, scrollWidth: 1000, clientWidth: 300 })
    })
    expect(screen.getByRole('button', { name: /see more/i })).toBeInTheDocument()
  })

  it('clicking "See more" calls scrollBy with left offset', () => {
    render(
      <ScrollRow ariaLabel="Clickable" itemCount={7} overflowThreshold={6}>
        <TileStrip count={7} />
      </ScrollRow>,
    )
    const region = screen.getByRole('region', { name: 'Clickable' })
    const scroller = region.firstElementChild as HTMLElement
    act(() => {
      setScrollerMetrics(region, { scrollLeft: 0, scrollWidth: 1000, clientWidth: 300 })
    })
    const scrollBySpy = vi.fn()
    scroller.scrollBy = scrollBySpy as unknown as typeof scroller.scrollBy
    fireEvent.click(screen.getByRole('button', { name: /see more/i }))
    expect(scrollBySpy).toHaveBeenCalledWith(
      expect.objectContaining({ left: 300, behavior: 'smooth' }),
    )
  })

  it('respects prefers-reduced-motion by falling back to behavior: auto', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as typeof window.matchMedia

    render(
      <ScrollRow ariaLabel="Reduced" itemCount={7} overflowThreshold={6}>
        <TileStrip count={7} />
      </ScrollRow>,
    )
    const region = screen.getByRole('region', { name: 'Reduced' })
    const scroller = region.firstElementChild as HTMLElement
    act(() => {
      setScrollerMetrics(region, { scrollLeft: 0, scrollWidth: 1000, clientWidth: 300 })
    })
    const scrollBySpy = vi.fn()
    scroller.scrollBy = scrollBySpy as unknown as typeof scroller.scrollBy
    fireEvent.click(screen.getByRole('button', { name: /see more/i }))
    expect(scrollBySpy).toHaveBeenCalledWith(
      expect.objectContaining({ left: 300, behavior: 'auto' }),
    )
  })
})
