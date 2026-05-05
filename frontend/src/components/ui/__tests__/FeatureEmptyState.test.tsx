import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { FeatureEmptyState } from '../FeatureEmptyState'

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('FeatureEmptyState', () => {
  it('renders icon with aria-hidden', () => {
    renderWithRouter(
      <FeatureEmptyState
        icon={Heart}
        heading="Test heading"
        description="Test description"
      />,
    )
    const icon = document.querySelector('svg')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders heading and description', () => {
    renderWithRouter(
      <FeatureEmptyState
        icon={Heart}
        heading="Your journal is waiting"
        description="Start writing today"
      />,
    )
    expect(screen.getByText('Your journal is waiting')).toBeInTheDocument()
    expect(screen.getByText('Start writing today')).toBeInTheDocument()
  })

  it('renders CTA link when ctaHref provided', () => {
    renderWithRouter(
      <FeatureEmptyState
        icon={Heart}
        heading="Heading"
        description="Description"
        ctaLabel="Start reading"
        ctaHref="/bible/john/1"
      />,
    )
    const link = screen.getByRole('link', { name: /start reading/i })
    expect(link).toHaveAttribute('href', '/bible/john/1')
  })

  it('renders CTA button when onCtaClick provided', async () => {
    const onClick = vi.fn()
    renderWithRouter(
      <FeatureEmptyState
        icon={Heart}
        heading="Heading"
        description="Description"
        ctaLabel="Write your first entry"
        onCtaClick={onClick}
      />,
    )
    const button = screen.getByRole('button', {
      name: /write your first entry/i,
    })
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not render CTA when no ctaLabel', () => {
    renderWithRouter(
      <FeatureEmptyState
        icon={Heart}
        heading="Heading"
        description="Description"
      />,
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('applies compact padding', () => {
    const { container } = renderWithRouter(
      <FeatureEmptyState
        icon={Heart}
        heading="Heading"
        description="Description"
        compact
      />,
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('py-6')
    expect(wrapper.className).not.toContain('py-12')
  })

  it('applies default (non-compact) padding', () => {
    const { container } = renderWithRouter(
      <FeatureEmptyState
        icon={Heart}
        heading="Heading"
        description="Description"
      />,
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('py-12')
  })

  it('CTA has min-height 44px', () => {
    renderWithRouter(
      <FeatureEmptyState
        icon={Heart}
        heading="Heading"
        description="Description"
        ctaLabel="Click me"
        onCtaClick={() => {}}
      />,
    )
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button.className).toContain('min-h-[44px]')
  })

  it('CTA has focus-visible ring', () => {
    renderWithRouter(
      <FeatureEmptyState
        icon={Heart}
        heading="Heading"
        description="Description"
        ctaLabel="Click me"
        onCtaClick={() => {}}
      />,
    )
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button.className).toContain('focus-visible:ring-2')
    expect(button.className).toContain('focus-visible:ring-primary/50')
  })

  it('CTA has white pill styling', () => {
    renderWithRouter(
      <FeatureEmptyState
        icon={Heart}
        heading="Heading"
        description="Description"
        ctaLabel="Click me"
        onCtaClick={() => {}}
      />,
    )
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button.className).toContain('rounded-full')
    expect(button.className).toContain('bg-white')
    expect(button.className).toContain('text-primary')
  })

  it('CTA has active scale', () => {
    renderWithRouter(
      <FeatureEmptyState
        icon={Heart}
        heading="Heading"
        description="Description"
        ctaLabel="Click me"
        onCtaClick={() => {}}
      />,
    )
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button.className).toContain('active:scale-[0.98]')
  })

  it('CTA text does not contain arrow', () => {
    renderWithRouter(
      <FeatureEmptyState
        icon={Heart}
        heading="Heading"
        description="Description"
        ctaLabel="Start reading"
        ctaHref="/bible"
      />,
    )
    const link = screen.getByRole('link', { name: /start reading/i })
    expect(link.textContent).not.toContain('→')
  })

  it('renders children between description and CTA', () => {
    renderWithRouter(
      <FeatureEmptyState
        icon={Heart}
        heading="Heading"
        description="Description"
        ctaLabel="Go"
        onCtaClick={() => {}}
      >
        <p>Extra content</p>
      </FeatureEmptyState>,
    )
    expect(screen.getByText('Extra content')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = renderWithRouter(
      <FeatureEmptyState
        icon={Heart}
        heading="Heading"
        description="Description"
        className="mt-8"
      />,
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('mt-8')
  })

  // Spec 5 Step 1 — iconClassName prop (additive, backward-compatible)

  it('uses default text-white/30 when iconClassName is omitted', () => {
    renderWithRouter(
      <FeatureEmptyState
        icon={Heart}
        heading="Heading"
        description="Description"
      />,
    )
    const icon = document.querySelector('svg') as SVGElement
    expect(icon.getAttribute('class')).toContain('text-white/30')
  })

  it('applies iconClassName when provided and omits the default', () => {
    renderWithRouter(
      <FeatureEmptyState
        icon={Heart}
        heading="Heading"
        description="Description"
        iconClassName="text-white/40"
      />,
    )
    const icon = document.querySelector('svg') as SVGElement
    const className = icon.getAttribute('class') ?? ''
    expect(className).toContain('text-white/40')
    expect(className).not.toContain('text-white/30')
  })

  it('preserves sizing classes when iconClassName is provided', () => {
    renderWithRouter(
      <FeatureEmptyState
        icon={Heart}
        heading="Heading"
        description="Description"
        iconClassName="text-amber-300"
      />,
    )
    const icon = document.querySelector('svg') as SVGElement
    const className = icon.getAttribute('class') ?? ''
    expect(className).toContain('text-amber-300')
    expect(className).toContain('h-10')
    expect(className).toContain('w-10')
    expect(className).toContain('sm:h-12')
    expect(className).toContain('sm:w-12')
  })
})
