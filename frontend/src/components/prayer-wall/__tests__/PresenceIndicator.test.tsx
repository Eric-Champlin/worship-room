import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PresenceIndicator } from '../PresenceIndicator'

const usePresenceMock = vi.fn()

vi.mock('@/hooks/usePresence', () => ({
  usePresence: (opts: { suppressed: boolean }) => usePresenceMock(opts),
}))

function setHook(value: { count: number | null; paused: boolean }) {
  usePresenceMock.mockImplementation(() => value)
}

describe('PresenceIndicator', () => {
  it('renders nothing when suppressed=true even if count is positive', () => {
    setHook({ count: 15, paused: true })
    const { container } = render(<PresenceIndicator suppressed={true} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when count is null (no fetch yet)', () => {
    setHook({ count: null, paused: false })
    const { container } = render(<PresenceIndicator suppressed={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when count is 0 (anti-pressure: no "be the first" CTA)', () => {
    setHook({ count: 0, paused: false })
    const { container } = render(<PresenceIndicator suppressed={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders singular at count=1', () => {
    setHook({ count: 1, paused: false })
    render(<PresenceIndicator suppressed={false} />)
    expect(screen.getByText('1 person here')).toBeInTheDocument()
  })

  it('renders plural at count=2', () => {
    setHook({ count: 2, paused: false })
    render(<PresenceIndicator suppressed={false} />)
    expect(screen.getByText('2 people here now')).toBeInTheDocument()
  })

  it('renders plural at count=15', () => {
    setHook({ count: 15, paused: false })
    render(<PresenceIndicator suppressed={false} />)
    expect(screen.getByText('15 people here now')).toBeInTheDocument()
  })

  it('renders plural at count=100', () => {
    setHook({ count: 100, paused: false })
    render(<PresenceIndicator suppressed={false} />)
    expect(screen.getByText('100 people here now')).toBeInTheDocument()
  })

  it('has role="status" and aria-live="polite" on outer element', () => {
    setHook({ count: 5, paused: false })
    render(<PresenceIndicator suppressed={false} />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })

  it('icon SVG is aria-hidden', () => {
    setHook({ count: 5, paused: false })
    const { container } = render(<PresenceIndicator suppressed={false} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('is not in the tab order (no positive tabindex)', () => {
    setHook({ count: 5, paused: false })
    render(<PresenceIndicator suppressed={false} />)
    const status = screen.getByRole('status')
    // No tabindex set anywhere inside (component is purely status, never focusable)
    expect(status.querySelector('[tabindex]')).toBeNull()
    expect(status.getAttribute('tabindex')).toBeNull()
  })
})
