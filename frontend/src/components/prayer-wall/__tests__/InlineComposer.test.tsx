import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
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

vi.mock('@/hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: () => ({
    showModal: false,
    confirmLeave: vi.fn(),
    cancelLeave: vi.fn(),
  }),
}))

function renderComposer(overrides?: {
  isOpen?: boolean
  onClose?: () => void
  onSubmit?: (
    content: string,
    isAnonymous: boolean,
    category: PrayerCategory,
    challengeId?: string,
    idempotencyKey?: string,
  ) => boolean | Promise<boolean>
}) {
  return render(
    <MemoryRouter>
      <InlineComposer
        isOpen={overrides?.isOpen ?? true}
        onClose={overrides?.onClose ?? vi.fn()}
        onSubmit={overrides?.onSubmit ?? vi.fn().mockResolvedValue(true)}
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
    expect(screen.getByText('510 / 1,000')).toBeInTheDocument()
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
    const onSubmit = vi.fn().mockResolvedValue(true)
    renderComposer({ onSubmit })
    await user.type(screen.getByLabelText('Prayer request'), 'My prayer')
    await user.click(screen.getByText('Health'))
    await user.click(screen.getByText('Submit Prayer Request'))
    expect(onSubmit).toHaveBeenCalledWith('My prayer', false, 'health', undefined, expect.any(String), 'prayer_request')
  })

  it('submit with anonymous checked', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(true)
    renderComposer({ onSubmit })
    await user.type(screen.getByLabelText('Prayer request'), 'My prayer')
    await user.click(screen.getByText('Health'))
    await user.click(screen.getByLabelText('Post anonymously'))
    await user.click(screen.getByText('Submit Prayer Request'))
    expect(onSubmit).toHaveBeenCalledWith('My prayer', true, 'health', undefined, expect.any(String), 'prayer_request')
  })

  // Category-specific tests
  it('renders 10 category pills when open', () => {
    renderComposer()
    const pills = ['Health', 'Mental Health', 'Family', 'Work', 'Grief', 'Gratitude', 'Praise', 'Relationships', 'Other', 'Discussion']
    for (const label of pills) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('selecting a pill highlights it (aria-checked)', async () => {
    const user = userEvent.setup()
    renderComposer()
    const healthPill = screen.getByRole('radio', { name: 'Health' })
    expect(healthPill).toHaveAttribute('aria-checked', 'false')
    await user.click(healthPill)
    expect(healthPill).toHaveAttribute('aria-checked', 'true')
  })

  it('only one pill can be selected at a time', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.click(screen.getByRole('radio', { name: 'Health' }))
    expect(screen.getByRole('radio', { name: 'Health' })).toHaveAttribute('aria-checked', 'true')

    await user.click(screen.getByRole('radio', { name: 'Grief' }))
    expect(screen.getByRole('radio', { name: 'Grief' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Health' })).toHaveAttribute('aria-checked', 'false')
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
    await user.click(screen.getByRole('radio', { name: 'Health' }))
    expect(screen.getByRole('radio', { name: 'Health' })).toHaveAttribute('aria-checked', 'true')

    await user.click(screen.getByText('Cancel'))
    expect(screen.getByRole('radio', { name: 'Health' })).toHaveAttribute('aria-checked', 'false')
  })

  it('composer char count visible at 500+ chars', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.type(screen.getByLabelText('Prayer request'), 'a'.repeat(500))
    expect(screen.getByText('500 / 1,000')).toBeInTheDocument()
  })

  it('composer warning color at 800 chars', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.type(screen.getByLabelText('Prayer request'), 'a'.repeat(800))
    expect(screen.getByText('800 / 1,000')).toHaveClass('text-amber-400')
  })

  it('category has required indicator', () => {
    renderComposer()
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('category fieldset has aria-invalid on error', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.type(screen.getByLabelText('Prayer request'), 'Test prayer')
    await user.click(screen.getByRole('button', { name: 'Submit Prayer Request' }))
    const fieldset = screen.getByRole('group')
    expect(fieldset).toHaveAttribute('aria-invalid', 'true')
    expect(fieldset).toHaveAttribute('aria-describedby', 'composer-category-error')
  })

  it('passes postType="prayer_request" to onSubmit by default when prop is omitted', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(true)
    renderComposer({ onSubmit })
    await user.type(screen.getByLabelText('Prayer request'), 'My prayer')
    await user.click(screen.getByText('Health'))
    await user.click(screen.getByText('Submit Prayer Request'))
    expect(onSubmit).toHaveBeenCalled()
    const args = onSubmit.mock.calls[0]
    expect(args[5]).toBe('prayer_request')
  })

  it('passes the postType prop value to onSubmit when set explicitly', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(true)
    render(
      <MemoryRouter>
        <InlineComposer
          isOpen
          onClose={vi.fn()}
          postType="testimony"
          onSubmit={onSubmit}
        />
      </MemoryRouter>,
    )
    await user.type(screen.getByLabelText('Prayer request'), 'My testimony')
    await user.click(screen.getByText('Health'))
    await user.click(screen.getByText('Submit Prayer Request'))
    expect(onSubmit).toHaveBeenCalled()
    const args = onSubmit.mock.calls[0]
    expect(args[5]).toBe('testimony')
  })

  it('calls onSubmit with arguments in canonical order: content, isAnonymous, category, challengeId, idempotencyKey, postType', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(true)
    renderComposer({ onSubmit })
    await user.type(screen.getByLabelText('Prayer request'), 'Order test')
    await user.click(screen.getByText('Gratitude'))
    await user.click(screen.getByText('Submit Prayer Request'))
    expect(onSubmit).toHaveBeenCalled()
    const [content, isAnonymous, category, challengeId, idempotencyKey, postType] = onSubmit.mock.calls[0]
    expect(typeof content).toBe('string')
    expect(typeof isAnonymous).toBe('boolean')
    expect(typeof category).toBe('string')
    expect(challengeId === undefined || typeof challengeId === 'string').toBe(true)
    expect(typeof idempotencyKey).toBe('string')
    expect(postType).toBe('prayer_request')
  })
})

describe('InlineComposer — accessibility', () => {
  it('textarea has aria-invalid when content exceeds max length', async () => {
    renderComposer()
    const textarea = screen.getByLabelText('Prayer request') as HTMLTextAreaElement
    // The maxLength attribute prevents typing beyond 1000, so we fire change via act
    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
      nativeInputValueSetter?.call(textarea, 'a'.repeat(1001))
      textarea.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(textarea).toHaveAttribute('aria-invalid', 'true')
  })

  it('textarea has aria-describedby linking to char count', () => {
    renderComposer()
    const textarea = screen.getByLabelText('Prayer request')
    expect(textarea).toHaveAttribute('aria-describedby', 'composer-char-count')
  })

  it('category container has role="radiogroup"', () => {
    renderComposer()
    expect(screen.getByRole('radiogroup', { name: 'Prayer category' })).toBeInTheDocument()
  })

  it('category pills have role="radio"', () => {
    renderComposer()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(10)
  })

  it('selected category pill has aria-checked="true"', async () => {
    const user = userEvent.setup()
    renderComposer()
    const healthRadio = screen.getByRole('radio', { name: 'Health' })
    await user.click(healthRadio)
    expect(healthRadio).toHaveAttribute('aria-checked', 'true')
  })

  it('unselected pills have aria-checked="false"', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.click(screen.getByRole('radio', { name: 'Health' }))
    const otherRadios = screen.getAllByRole('radio').filter((r) => r.textContent !== 'Health')
    for (const radio of otherRadios) {
      expect(radio).toHaveAttribute('aria-checked', 'false')
    }
  })

  it('only one pill has tabIndex 0', () => {
    renderComposer()
    const radios = screen.getAllByRole('radio')
    const withTabZero = radios.filter((r) => r.getAttribute('tabindex') === '0')
    expect(withTabZero).toHaveLength(1)
  })

  it('ArrowRight moves focus to next pill', async () => {
    const user = userEvent.setup()
    renderComposer()
    const radios = screen.getAllByRole('radio')
    radios[0].focus()
    await user.keyboard('{ArrowRight}')
    expect(radios[1]).toHaveFocus()
  })

  it('Enter selects focused pill', async () => {
    const user = userEvent.setup()
    renderComposer()
    const radios = screen.getAllByRole('radio')
    radios[0].focus()
    await user.keyboard('{Enter}')
    expect(radios[0]).toHaveAttribute('aria-checked', 'true')
  })

  it('submitting without category shows inline error', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.type(screen.getByLabelText('Prayer request'), 'My prayer')
    await user.click(screen.getByRole('button', { name: 'Submit Prayer Request' }))
    const error = screen.getByText('Please choose a category')
    expect(error).toBeInTheDocument()
    expect(error).toHaveAttribute('role', 'alert')
  })
})
