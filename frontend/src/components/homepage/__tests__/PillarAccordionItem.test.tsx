import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { PillarAccordionItem } from '../PillarAccordionItem'
import type { PillarFeature } from '../pillar-data'

vi.mock('@/hooks/useScrollReveal', () => ({
  useScrollReveal: () => ({ ref: { current: null }, isVisible: true }),
  staggerDelay: (i: number, base = 100, initial = 0) => ({
    transitionDelay: `${initial + i * base}ms`,
  }),
}))

const DEVOTIONAL_FEATURE: PillarFeature = {
  name: 'Devotionals',
  description:
    'A fresh devotional every morning -- an inspiring quote, scripture, and reflection tied to the current season of the church year.',
  previewKey: 'devotional',
}

const MOOD_FEATURE: PillarFeature = {
  name: 'Mood Check-in',
  description: 'Start each day by sharing how you\'re feeling.',
  previewKey: 'mood-checkin',
}

const defaultProps = {
  feature: DEVOTIONAL_FEATURE,
  accent: 'purple' as const,
  isExpanded: false,
  onToggle: vi.fn(),
  index: 0,
  isVisible: true,
}

describe('PillarAccordionItem', () => {
  it('renders feature name', () => {
    render(<PillarAccordionItem {...defaultProps} />)
    expect(screen.getByText('Devotionals')).toBeInTheDocument()
  })

  it('trigger is a button element', () => {
    render(<PillarAccordionItem {...defaultProps} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('collapsed: aria-expanded="false"', () => {
    render(<PillarAccordionItem {...defaultProps} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
  })

  it('expanded: aria-expanded="true"', () => {
    render(<PillarAccordionItem {...defaultProps} isExpanded />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
  })

  it('expanded: content panel visible (aria-hidden="false")', () => {
    const { container } = render(<PillarAccordionItem {...defaultProps} isExpanded />)
    const panel = container.querySelector('[role="region"]')
    expect(panel).toHaveAttribute('aria-hidden', 'false')
  })

  it('collapsed: content panel hidden (aria-hidden="true")', () => {
    const { container } = render(<PillarAccordionItem {...defaultProps} />)
    const panel = container.querySelector('[role="region"]')
    expect(panel).toHaveAttribute('aria-hidden', 'true')
  })

  it('expanded: description text renders', () => {
    render(<PillarAccordionItem {...defaultProps} isExpanded />)
    expect(
      screen.getByText(/A fresh devotional every morning/)
    ).toBeInTheDocument()
  })

  it('expanded: chevron has rotate-180 class', () => {
    const { container } = render(<PillarAccordionItem {...defaultProps} isExpanded />)
    const chevron = container.querySelector('.rotate-180')
    expect(chevron).toBeInTheDocument()
  })

  it('expanded: name uses font-semibold', () => {
    render(<PillarAccordionItem {...defaultProps} isExpanded />)
    const name = screen.getByText('Devotionals')
    expect(name.className).toContain('font-semibold')
  })

  it('expanded: left border accent visible', () => {
    const { container } = render(<PillarAccordionItem {...defaultProps} isExpanded />)
    const borderEl = container.querySelector('.border-l-2')
    expect(borderEl).toBeInTheDocument()
  })

  it('calls onToggle when clicked', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<PillarAccordionItem {...defaultProps} onToggle={onToggle} />)
    await user.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('scroll-reveal class applied', () => {
    const { container } = render(<PillarAccordionItem {...defaultProps} />)
    expect(container.querySelector('.scroll-reveal')).toBeInTheDocument()
  })

  it('stagger delay style applied', () => {
    const { container } = render(<PillarAccordionItem {...defaultProps} index={2} />)
    const el = container.querySelector('.scroll-reveal') as HTMLElement
    expect(el.style.transitionDelay).toBe('360ms')
  })

  it('renders devotional preview when expanded with previewKey="devotional"', () => {
    render(<PillarAccordionItem {...defaultProps} isExpanded />)
    expect(screen.getByText(/The Lord is my shepherd/)).toBeInTheDocument()
  })

  it('renders mood dots for mood-checkin preview', () => {
    const { container } = render(
      <PillarAccordionItem
        {...defaultProps}
        feature={MOOD_FEATURE}
        isExpanded
      />
    )
    const dots = container.querySelectorAll('.rounded-full[style*="background-color"]')
    expect(dots).toHaveLength(5)
  })

  it('collapsed: max-height is 0px', () => {
    const { container } = render(<PillarAccordionItem {...defaultProps} />)
    const panel = container.querySelector('[role="region"]') as HTMLElement
    expect(panel.style.maxHeight).toBe('0px')
  })

  it('expanded: max-height is 500px', () => {
    const { container } = render(<PillarAccordionItem {...defaultProps} isExpanded />)
    const panel = container.querySelector('[role="region"]') as HTMLElement
    expect(panel.style.maxHeight).toBe('500px')
  })
})
