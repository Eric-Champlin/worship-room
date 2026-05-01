import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RelatedPlanCallout } from '../RelatedPlanCallout'

const mockOpenAuthModal = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

function renderCallout(overrides: Partial<{
  planId: string
  planTitle: string
  planDuration: number
  planStatus: 'unstarted' | 'active' | 'paused' | 'completed'
}> = {}) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <RelatedPlanCallout
        planId={overrides.planId ?? 'learning-to-trust-god'}
        planTitle={overrides.planTitle ?? 'Learning to Trust God'}
        planDuration={overrides.planDuration ?? 7}
        planStatus={overrides.planStatus ?? 'unstarted'}
      />
    </MemoryRouter>,
  )
}

describe('RelatedPlanCallout', () => {
  it('renders with plan title and Go Deeper label', () => {
    renderCallout()
    expect(screen.getByText('Go Deeper')).toBeInTheDocument()
    expect(screen.getByText('Learning to Trust God')).toBeInTheDocument()
    expect(screen.getByText('7-day plan')).toBeInTheDocument()
  })

  it('shows "Start this plan" for unstarted plans', () => {
    renderCallout({ planStatus: 'unstarted' })
    expect(screen.getByText('Start this plan')).toBeInTheDocument()
  })

  it('shows "Continue this plan" for active plans', () => {
    renderCallout({ planStatus: 'active' })
    expect(screen.getByText('Continue this plan')).toBeInTheDocument()
  })

  it('shows "Continue this plan" for paused plans', () => {
    renderCallout({ planStatus: 'paused' })
    expect(screen.getByText('Continue this plan')).toBeInTheDocument()
  })

  it('link navigates to /reading-plans/:planId', () => {
    renderCallout({ planId: 'test-plan' })
    const link = screen.getByText('Start this plan').closest('a')
    expect(link).toHaveAttribute('href', '/reading-plans/test-plan')
  })

  it('auth modal on Start click for logged-out users', async () => {
    const user = userEvent.setup()
    renderCallout()
    await user.click(screen.getByText('Start this plan'))
    expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to start this reading plan')
  })

  it('renders inside a FrostedCard accent variant (violet hallmark class)', () => {
    const { container } = renderCallout()
    const accentCard = container.querySelector('.bg-violet-500\\/\\[0\\.08\\]')
    expect(accentCard).not.toBeNull()
  })

  it('eyebrow renders with violet leading dot', () => {
    renderCallout()
    const eyebrow = screen.getByText('Go Deeper')
    const dot = eyebrow.previousElementSibling as HTMLElement
    expect(dot).not.toBeNull()
    expect(dot.className).toContain('bg-violet-400')
    expect(dot.className).toContain('rounded-full')
  })

  it('CTA renders as subtle Button with min-h-[44px] and mt-4', () => {
    renderCallout()
    const link = screen.getByText('Start this plan').closest('a') as HTMLAnchorElement
    expect(link).not.toBeNull()
    expect(link.className).toContain('min-h-[44px]')
    expect(link.className).toContain('rounded-full')
    expect(link.className).toContain('text-white')
    expect(link.className).toContain('mt-4')
    expect(link.className).toContain('bg-white/[0.07]')
  })
})
