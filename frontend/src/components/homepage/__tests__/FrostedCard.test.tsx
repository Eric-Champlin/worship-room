import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { FrostedCard } from '../FrostedCard'

describe('FrostedCard', () => {
  it('renders children', () => {
    render(<FrostedCard>Card content</FrostedCard>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('renders as div by default', () => {
    const { container } = render(<FrostedCard>Content</FrostedCard>)
    expect(container.firstElementChild?.tagName).toBe('DIV')
  })

  it('as="button" renders button element', () => {
    render(
      <FrostedCard as="button" onClick={vi.fn()}>
        Click me
      </FrostedCard>,
    )
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('as="button" defaults to type="button" (prevents accidental form submit)', () => {
    render(
      <FrostedCard as="button" onClick={vi.fn()}>
        Click me
      </FrostedCard>,
    )
    expect(screen.getByRole('button', { name: 'Click me' })).toHaveAttribute('type', 'button')
  })

  it('as="button" honors explicit type prop', () => {
    render(
      <FrostedCard as="button" type="submit" onClick={vi.fn()}>
        Submit
      </FrostedCard>,
    )
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('type', 'submit')
  })

  it('as="div" does not render a type attribute', () => {
    const { container } = render(<FrostedCard>Content</FrostedCard>)
    expect(container.firstElementChild).not.toHaveAttribute('type')
  })

  it('as="article" does not render a type attribute', () => {
    const { container } = render(<FrostedCard as="article">Content</FrostedCard>)
    expect(container.firstElementChild).not.toHaveAttribute('type')
  })

  it('as="article" renders article element', () => {
    const { container } = render(<FrostedCard as="article">Article content</FrostedCard>)
    expect(container.querySelector('article')).toBeInTheDocument()
  })

  it('with onClick has cursor-pointer', () => {
    const { container } = render(<FrostedCard onClick={vi.fn()}>Clickable</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('cursor-pointer')
  })

  it('without onClick lacks interactive hover classes', () => {
    const { container } = render(<FrostedCard>Static</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).not.toContain('cursor-pointer')
  })

  it('applies custom className', () => {
    const { container } = render(<FrostedCard className="my-custom-class">Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('my-custom-class')
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(
      <FrostedCard as="button" onClick={handleClick}>
        Click me
      </FrostedCard>,
    )
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('default tier has border-white/[0.12] base border', () => {
    const { container } = render(<FrostedCard>Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('border-white/[0.12]')
  })

  it('default tier has bg-white/[0.07] base background', () => {
    const { container } = render(<FrostedCard>Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('bg-white/[0.07]')
  })

  it('default tier has shadow-frosted-base', () => {
    const { container } = render(<FrostedCard>Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('shadow-frosted-base')
  })

  it('interactive default tier has hover bg-white/[0.10]', () => {
    const { container } = render(<FrostedCard onClick={vi.fn()}>Clickable</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('hover:bg-white/[0.10]')
  })

  it('interactive default tier has hover shadow-frosted-hover', () => {
    const { container } = render(<FrostedCard onClick={vi.fn()}>Clickable</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('shadow-frosted-hover')
  })

  it('accent tier has bg-violet-500/[0.08]', () => {
    const { container } = render(<FrostedCard variant="accent">Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('bg-violet-500/[0.08]')
  })

  it('accent tier has border-violet-400/70', () => {
    const { container } = render(<FrostedCard variant="accent">Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('border-violet-400/70')
  })

  it('accent tier has shadow-frosted-accent', () => {
    const { container } = render(<FrostedCard variant="accent">Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('shadow-frosted-accent')
  })

  it('accent tier interactive hover applies shadow-frosted-accent-hover', () => {
    const { container } = render(
      <FrostedCard variant="accent" onClick={vi.fn()}>
        Clickable
      </FrostedCard>,
    )
    expect((container.firstElementChild as HTMLElement).className).toContain(
      'hover:shadow-frosted-accent-hover',
    )
  })

  it('subdued tier has bg-white/[0.05]', () => {
    const { container } = render(<FrostedCard variant="subdued">Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('bg-white/[0.05]')
  })

  it('subdued tier has border-white/[0.10]', () => {
    const { container } = render(<FrostedCard variant="subdued">Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('border-white/[0.10]')
  })

  it('subdued tier has no shadow class', () => {
    const { container } = render(<FrostedCard variant="subdued">Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).not.toContain('shadow-frosted-')
  })

  it('variant defaults to default when prop omitted', () => {
    const { container: omitted } = render(<FrostedCard>Content</FrostedCard>)
    const { container: explicit } = render(<FrostedCard variant="default">Content</FrostedCard>)
    const omittedCls = (omitted.firstElementChild as HTMLElement).className
    const explicitCls = (explicit.firstElementChild as HTMLElement).className
    expect(omittedCls).toContain('bg-white/[0.07]')
    expect(omittedCls).toContain('border-white/[0.12]')
    expect(omittedCls).toContain('shadow-frosted-base')
    expect(explicitCls).toContain('bg-white/[0.07]')
    expect(explicitCls).toContain('border-white/[0.12]')
    expect(explicitCls).toContain('shadow-frosted-base')
  })

  it('all variants use rounded-3xl', () => {
    for (const variant of ['accent', 'default', 'subdued'] as const) {
      const { container } = render(<FrostedCard variant={variant}>x</FrostedCard>)
      expect((container.firstElementChild as HTMLElement).className).toContain('rounded-3xl')
    }
  })

  it('accent tier has top-edge highlight (:before pseudo-element)', () => {
    const { container } = render(<FrostedCard variant="accent">Content</FrostedCard>)
    const cls = (container.firstElementChild as HTMLElement).className
    expect(cls).toContain('before:bg-gradient-to-r')
    expect(cls).toContain('before:from-transparent')
    expect(cls).toContain('before:via-white/[0.10]')
    expect(cls).toContain('before:to-transparent')
    expect(cls).toContain('before:rounded-t-3xl')
    expect(cls).toContain('relative')
  })

  it('default tier does NOT have top-edge highlight', () => {
    const { container } = render(<FrostedCard variant="default">Content</FrostedCard>)
    const cls = (container.firstElementChild as HTMLElement).className
    expect(cls).not.toContain('before:bg-gradient-to-r')
  })

  it('subdued tier does NOT have top-edge highlight', () => {
    const { container } = render(<FrostedCard variant="subdued">Content</FrostedCard>)
    const cls = (container.firstElementChild as HTMLElement).className
    expect(cls).not.toContain('before:bg-gradient-to-r')
  })

  describe('eyebrow', () => {
    it('eyebrow renders when prop provided', () => {
      render(<FrostedCard eyebrow="Today's reading">Body</FrostedCard>)
      expect(screen.getByText("Today's reading")).toBeInTheDocument()
    })

    it('eyebrow does not render when prop omitted', () => {
      const { container } = render(<FrostedCard>Body</FrostedCard>)
      expect(container.querySelector('[class*="tracking-[0.15em]"]')).toBeNull()
    })

    it('accent tier eyebrow uses violet-300 text and violet-400 dot', () => {
      render(<FrostedCard variant="accent" eyebrow="Featured">Body</FrostedCard>)
      const label = screen.getByText('Featured')
      expect(label.className).toContain('text-violet-300')
      const dot = label.previousElementSibling as HTMLElement
      expect(dot?.className).toContain('bg-violet-400')
    })

    it('default tier eyebrow uses white/50 text and white/40 dot', () => {
      render(<FrostedCard variant="default" eyebrow="Note">Body</FrostedCard>)
      const label = screen.getByText('Note')
      expect(label.className).toContain('text-white/50')
      const dot = label.previousElementSibling as HTMLElement
      expect(dot?.className).toContain('bg-white/40')
    })
  })
})
