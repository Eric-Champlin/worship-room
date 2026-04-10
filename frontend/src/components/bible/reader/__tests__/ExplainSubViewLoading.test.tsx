import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const { mockUseReducedMotion } = vi.hoisted(() => ({
  mockUseReducedMotion: vi.fn(),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}))

import { ExplainSubViewLoading } from '../ExplainSubViewLoading'

beforeEach(() => {
  mockUseReducedMotion.mockReset()
})

describe('ExplainSubViewLoading', () => {
  it('renders the "Thinking…" label', () => {
    mockUseReducedMotion.mockReturnValue(false)
    render(<ExplainSubViewLoading />)
    expect(screen.getByText('Thinking…')).toBeInTheDocument()
  })

  it('has role="status" and aria-live="polite"', () => {
    mockUseReducedMotion.mockReturnValue(false)
    const { container } = render(<ExplainSubViewLoading />)
    const status = container.querySelector('[role="status"]')
    expect(status).not.toBeNull()
    expect(status?.getAttribute('aria-live')).toBe('polite')
  })

  it('renders 4 animated skeleton bars when motion is allowed', () => {
    mockUseReducedMotion.mockReturnValue(false)
    const { container } = render(<ExplainSubViewLoading />)
    const pulseBars = container.querySelectorAll('.animate-pulse')
    expect(pulseBars.length).toBe(4)
  })

  it('hides skeleton bars when prefers-reduced-motion is set', () => {
    mockUseReducedMotion.mockReturnValue(true)
    const { container } = render(<ExplainSubViewLoading />)
    const pulseBars = container.querySelectorAll('.animate-pulse')
    expect(pulseBars.length).toBe(0)
    // Static label still renders
    expect(screen.getByText('Thinking…')).toBeInTheDocument()
  })
})
