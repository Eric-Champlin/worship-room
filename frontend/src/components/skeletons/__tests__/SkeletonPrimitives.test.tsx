import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SkeletonBlock, SkeletonText, SkeletonCircle, SkeletonCard } from '../index'

describe('SkeletonBlock', () => {
  it('renders with default dimensions', () => {
    const { container } = render(<SkeletonBlock />)
    const el = container.firstElementChild as HTMLElement
    expect(el.style.width).toBe('100%')
    expect(el.style.height).toBe('16px')
  })

  it('applies custom width and height as style', () => {
    const { container } = render(<SkeletonBlock width="200px" height="40px" />)
    const el = container.firstElementChild as HTMLElement
    expect(el.style.width).toBe('200px')
    expect(el.style.height).toBe('40px')
  })

  it('applies numeric width and height as px', () => {
    const { container } = render(<SkeletonBlock width={200} height={40} />)
    const el = container.firstElementChild as HTMLElement
    expect(el.style.width).toBe('200px')
    expect(el.style.height).toBe('40px')
  })

  it('applies custom rounded class', () => {
    const { container } = render(<SkeletonBlock rounded="rounded-full" />)
    const el = container.firstElementChild as HTMLElement
    expect(el.className).toContain('rounded-full')
  })

  it('applies custom className', () => {
    const { container } = render(<SkeletonBlock className="mx-auto" />)
    const el = container.firstElementChild as HTMLElement
    expect(el.className).toContain('mx-auto')
  })

  it('has aria-hidden="true"', () => {
    const { container } = render(<SkeletonBlock />)
    const el = container.firstElementChild as HTMLElement
    expect(el.getAttribute('aria-hidden')).toBe('true')
  })

  it('has shimmer gradient background', () => {
    const { container } = render(<SkeletonBlock />)
    const el = container.firstElementChild as HTMLElement
    expect(el.style.backgroundImage).toContain('linear-gradient')
    expect(el.style.backgroundSize).toBe('200% 100%')
  })

  it('uses motion-safe:animate-shimmer class', () => {
    const { container } = render(<SkeletonBlock />)
    const el = container.firstElementChild as HTMLElement
    expect(el.className).toContain('motion-safe:animate-shimmer')
  })

  it('has bg-white/[0.06] class', () => {
    const { container } = render(<SkeletonBlock />)
    const el = container.firstElementChild as HTMLElement
    expect(el.className).toContain('bg-white/[0.06]')
  })
})

describe('SkeletonText', () => {
  it('renders 3 lines by default', () => {
    const { container } = render(<SkeletonText />)
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.children.length).toBe(3)
  })

  it('renders custom line count', () => {
    const { container } = render(<SkeletonText lines={5} />)
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.children.length).toBe(5)
  })

  it('last line has 60% width by default', () => {
    const { container } = render(<SkeletonText />)
    const wrapper = container.firstElementChild as HTMLElement
    const lastChild = wrapper.lastElementChild as HTMLElement
    expect(lastChild.style.width).toBe('60%')
  })

  it('accepts custom lastLineWidth', () => {
    const { container } = render(<SkeletonText lastLineWidth="80%" />)
    const wrapper = container.firstElementChild as HTMLElement
    const lastChild = wrapper.lastElementChild as HTMLElement
    expect(lastChild.style.width).toBe('80%')
  })

  it('non-last lines have 100% width', () => {
    const { container } = render(<SkeletonText lines={3} />)
    const wrapper = container.firstElementChild as HTMLElement
    const firstChild = wrapper.firstElementChild as HTMLElement
    expect(firstChild.style.width).toBe('100%')
  })

  it('child SkeletonBlocks have aria-hidden="true"', () => {
    const { container } = render(<SkeletonText />)
    const wrapper = container.firstElementChild as HTMLElement
    const firstChild = wrapper.firstElementChild as HTMLElement
    expect(firstChild.getAttribute('aria-hidden')).toBe('true')
  })

  it('uses flex column layout with gap', () => {
    const { container } = render(<SkeletonText />)
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('flex')
    expect(wrapper.className).toContain('flex-col')
    expect(wrapper.className).toContain('gap-2')
  })
})

describe('SkeletonCircle', () => {
  it('renders with default size 40', () => {
    const { container } = render(<SkeletonCircle />)
    const el = container.firstElementChild as HTMLElement
    expect(el.style.width).toBe('40px')
    expect(el.style.height).toBe('40px')
  })

  it('renders with custom size', () => {
    const { container } = render(<SkeletonCircle size={80} />)
    const el = container.firstElementChild as HTMLElement
    expect(el.style.width).toBe('80px')
    expect(el.style.height).toBe('80px')
  })

  it('has rounded-full class', () => {
    const { container } = render(<SkeletonCircle />)
    const el = container.firstElementChild as HTMLElement
    expect(el.className).toContain('rounded-full')
  })

  it('has equal width and height', () => {
    const { container } = render(<SkeletonCircle size={60} />)
    const el = container.firstElementChild as HTMLElement
    expect(el.style.width).toBe(el.style.height)
  })
})

describe('SkeletonCard', () => {
  it('renders container with correct classes', () => {
    const { container } = render(<SkeletonCard />)
    const el = container.firstElementChild as HTMLElement
    expect(el.className).toContain('bg-white/[0.06]')
    expect(el.className).toContain('border')
    expect(el.className).toContain('border-white/10')
    expect(el.className).toContain('rounded-xl')
    expect(el.className).toContain('p-4')
  })

  it('renders children', () => {
    render(
      <SkeletonCard>
        <span data-testid="child">Hello</span>
      </SkeletonCard>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<SkeletonCard className="rounded-2xl" />)
    const el = container.firstElementChild as HTMLElement
    expect(el.className).toContain('rounded-2xl')
  })

  it('has aria-hidden="true"', () => {
    const { container } = render(<SkeletonCard />)
    const el = container.firstElementChild as HTMLElement
    expect(el.getAttribute('aria-hidden')).toBe('true')
  })
})
