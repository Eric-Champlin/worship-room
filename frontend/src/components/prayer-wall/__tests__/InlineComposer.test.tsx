import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { InlineComposer } from '../InlineComposer'
import type { PrayerCategory } from '@/constants/prayer-categories'

vi.mock('@/lib/challenge-calendar', () => ({
  getActiveChallengeInfo: () => null,
}))

vi.mock('@/data/challenges', () => ({
  getChallenge: () => undefined,
  CHALLENGES: [],
}))

function renderComposer(overrides?: { isOpen?: boolean; onClose?: () => void; onSubmit?: (content: string, isAnonymous: boolean, category: PrayerCategory, challengeId?: string) => void }) {
  return render(
    <MemoryRouter>
      <InlineComposer
        isOpen={overrides?.isOpen ?? true}
        onClose={overrides?.onClose ?? vi.fn()}
        onSubmit={overrides?.onSubmit ?? vi.fn()}
      />
    </MemoryRouter>,
  )
}

describe('InlineComposer', () => {
  it('renders textarea and submit button when open', () => {
    renderComposer()
    expect(screen.getByLabelText('Prayer request')).toBeInTheDocument()
    expect(screen.getByText('Submit Prayer Request')).toBeInTheDocument()
  })

  it('submit button disabled when textarea is empty', () => {
    renderComposer()
    const submitBtn = screen.getByText('Submit Prayer Request')
    expect(submitBtn).toBeDisabled()
  })

  it('submit button enabled when textarea has content', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.type(screen.getByLabelText('Prayer request'), 'Please pray for me')
    const submitBtn = screen.getByText('Submit Prayer Request')
    expect(submitBtn).not.toBeDisabled()
  })

  it('character counter appears at 500+ characters', async () => {
    const user = userEvent.setup()
    renderComposer()
    const longText = 'a'.repeat(510)
    await user.type(screen.getByLabelText('Prayer request'), longText)
    expect(screen.getByText('510/1,000')).toBeInTheDocument()
  })

  it('cancel button calls onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderComposer({ onClose })
    await user.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('submit calls onSubmit with content, anonymous flag, and category', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderComposer({ onSubmit })
    await user.type(screen.getByLabelText('Prayer request'), 'My prayer')
    await user.click(screen.getByText('Health'))
    await user.click(screen.getByText('Submit Prayer Request'))
    expect(onSubmit).toHaveBeenCalledWith('My prayer', false, 'health', undefined)
  })

  it('submit with anonymous checked', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderComposer({ onSubmit })
    await user.type(screen.getByLabelText('Prayer request'), 'My prayer')
    await user.click(screen.getByText('Health'))
    await user.click(screen.getByLabelText('Post anonymously'))
    await user.click(screen.getByText('Submit Prayer Request'))
    expect(onSubmit).toHaveBeenCalledWith('My prayer', true, 'health', undefined)
  })

  // Category-specific tests
  it('renders 9 category pills when open', () => {
    renderComposer()
    const pills = ['Health', 'Family', 'Work', 'Grief', 'Gratitude', 'Praise', 'Relationships', 'Other', 'Discussion']
    for (const label of pills) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('selecting a pill highlights it (aria-pressed)', async () => {
    const user = userEvent.setup()
    renderComposer()
    const healthPill = screen.getByText('Health')
    expect(healthPill).toHaveAttribute('aria-pressed', 'false')
    await user.click(healthPill)
    expect(healthPill).toHaveAttribute('aria-pressed', 'true')
  })

  it('only one pill can be selected at a time', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.click(screen.getByText('Health'))
    expect(screen.getByText('Health')).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByText('Grief'))
    expect(screen.getByText('Grief')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Health')).toHaveAttribute('aria-pressed', 'false')
  })

  it('submit without category shows validation error', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderComposer({ onSubmit })
    await user.type(screen.getByLabelText('Prayer request'), 'My prayer')
    await user.click(screen.getByText('Submit Prayer Request'))
    expect(screen.getByText('Please choose a category')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('validation error clears when category selected', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.type(screen.getByLabelText('Prayer request'), 'My prayer')
    await user.click(screen.getByText('Submit Prayer Request'))
    expect(screen.getByText('Please choose a category')).toBeInTheDocument()

    await user.click(screen.getByText('Family'))
    expect(screen.queryByText('Please choose a category')).not.toBeInTheDocument()
  })

  it('cancel resets category selection', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.click(screen.getByText('Health'))
    expect(screen.getByText('Health')).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByText('Cancel'))
    expect(screen.getByText('Health')).toHaveAttribute('aria-pressed', 'false')
  })
})
