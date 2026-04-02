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
      </FrostedCard>
    )
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('as="article" renders article element', () => {
    const { container } = render(
      <FrostedCard as="article">Article content</FrostedCard>
    )
    expect(container.querySelector('article')).toBeInTheDocument()
  })

  it('with onClick has cursor-pointer', () => {
    const { container } = render(
      <FrostedCard onClick={vi.fn()}>Clickable</FrostedCard>
    )
    expect((container.firstElementChild as HTMLElement).className).toContain('cursor-pointer')
  })

  it('without onClick lacks interactive hover classes', () => {
    const { container } = render(<FrostedCard>Static</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).not.toContain('cursor-pointer')
  })

  it('applies custom className', () => {
    const { container } = render(
      <FrostedCard className="my-custom-class">Content</FrostedCard>
    )
    expect((container.firstElementChild as HTMLElement).className).toContain('my-custom-class')
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(
      <FrostedCard as="button" onClick={handleClick}>
        Click me
      </FrostedCard>
    )
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('has border-white/[0.12] base border', () => {
    const { container } = render(<FrostedCard>Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('border-white/[0.12]')
  })

  it('has bg-white/[0.06] base background', () => {
    const { container } = render(<FrostedCard>Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('bg-white/[0.06]')
  })

  it('has base box-shadow', () => {
    const { container } = render(<FrostedCard>Content</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('shadow-[0_0_25px')
  })

  it('interactive card has hover border-white/[0.18]', () => {
    const { container } = render(<FrostedCard onClick={vi.fn()}>Clickable</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('hover:border-white/[0.18]')
  })

  it('interactive card has hover shadow', () => {
    const { container } = render(<FrostedCard onClick={vi.fn()}>Clickable</FrostedCard>)
    expect((container.firstElementChild as HTMLElement).className).toContain('hover:shadow-[0_0_35px')
  })
})
