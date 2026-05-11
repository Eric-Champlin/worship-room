import { describe, it, expect, vi } from 'vitest'
import { render, screen, act, within } from '@testing-library/react'
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
    expect(onSubmit).toHaveBeenCalledWith(
      'My prayer',
      false,
      'health',
      undefined,
      expect.any(String),
      'prayer_request',
      null, // scriptureReference
      null, // scriptureText
      null, // imageUploadId (Spec 4.6b)
      null, // imageAltText (Spec 4.6b)
      null, // helpTags (Spec 4.7b) — null when no chips selected
    )
  })

  it('submit with anonymous checked', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(true)
    renderComposer({ onSubmit })
    await user.type(screen.getByLabelText('Prayer request'), 'My prayer')
    await user.click(screen.getByText('Health'))
    await user.click(screen.getByLabelText('Post anonymously'))
    await user.click(screen.getByText('Submit Prayer Request'))
    expect(onSubmit).toHaveBeenCalledWith(
      'My prayer',
      true,
      'health',
      undefined,
      expect.any(String),
      'prayer_request',
      null, // scriptureReference
      null, // scriptureText
      null, // imageUploadId (Spec 4.6b)
      null, // imageAltText (Spec 4.6b)
      null, // helpTags (Spec 4.7b) — null when no chips selected
    )
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
    // Spec 4.7b — Two role="group" elements now exist on the prayer_request
    // composer (category fieldset + WaysToHelpPicker). Filter to the fieldset.
    const fieldset = screen
      .getAllByRole('group')
      .find((el) => el.tagName === 'FIELDSET')!
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
    // Spec 4.3: testimony composer uses "Testimony" textarea label, hides
    // the category fieldset, and has a "Submit Testimony" submit button.
    await user.type(screen.getByLabelText('Testimony'), 'My testimony')
    await user.click(screen.getByText('Submit Testimony'))
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

// =====================================================================
// Spec 4.3 — testimony composer per-type copy + behavior
// =====================================================================

function renderTestimonyComposer(overrides?: {
  onSubmit?: Parameters<typeof renderComposer>[0] extends infer T
    ? T extends { onSubmit?: infer S }
      ? S
      : never
    : never
}) {
  return render(
    <MemoryRouter>
      <InlineComposer
        isOpen
        onClose={vi.fn()}
        postType="testimony"
        onSubmit={overrides?.onSubmit ?? vi.fn().mockResolvedValue(true)}
      />
    </MemoryRouter>,
  )
}

describe('InlineComposer — Spec 4.3 testimony', () => {
  it('renders testimony header copy when postType is testimony', () => {
    renderTestimonyComposer()
    expect(screen.getByText('Share a testimony')).toBeInTheDocument()
  })

  it('renders testimony placeholder when postType is testimony', () => {
    renderTestimonyComposer()
    expect(screen.getByPlaceholderText('What has God done?')).toBeInTheDocument()
  })

  it('textarea aria-label is "Testimony" for testimony', () => {
    renderTestimonyComposer()
    expect(screen.getByLabelText('Testimony')).toBeInTheDocument()
  })

  it('textarea maxLength is 5000 for testimony', () => {
    renderTestimonyComposer()
    expect(screen.getByLabelText('Testimony')).toHaveAttribute('maxLength', '5000')
  })

  it('textarea maxLength is 1000 for prayer_request (frontend asymmetry preserved per MPD-2)', () => {
    renderComposer()
    expect(screen.getByLabelText('Prayer request')).toHaveAttribute('maxLength', '1000')
  })

  it('textarea minHeight is 180px for testimony', () => {
    renderTestimonyComposer()
    const textarea = screen.getByLabelText('Testimony')
    expect((textarea as HTMLTextAreaElement).style.minHeight).toBe('180px')
  })

  it('textarea minHeight is 120px for prayer_request', () => {
    renderComposer()
    const textarea = screen.getByLabelText('Prayer request')
    expect((textarea as HTMLTextAreaElement).style.minHeight).toBe('120px')
  })

  it('attribution nudge renders for testimony', () => {
    renderTestimonyComposer()
    expect(screen.getByText(/Testimonies often mean more/)).toBeInTheDocument()
  })

  it('attribution nudge does NOT render for prayer_request', () => {
    renderComposer()
    expect(screen.queryByText(/Testimonies often mean more/)).not.toBeInTheDocument()
  })

  it('category fieldset is hidden for testimony', () => {
    renderTestimonyComposer()
    expect(screen.queryByRole('radiogroup', { name: /prayer category/i })).not.toBeInTheDocument()
  })

  it('category fieldset is visible for prayer_request', () => {
    renderComposer()
    expect(screen.getByRole('radiogroup', { name: /prayer category/i })).toBeInTheDocument()
  })

  it('submit handler receives postType=testimony', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(true)
    renderTestimonyComposer({ onSubmit })
    await user.type(screen.getByLabelText('Testimony'), 'Praise God for healing.')
    await user.click(screen.getByRole('button', { name: /submit testimony/i }))
    expect(onSubmit).toHaveBeenCalled()
    const args = onSubmit.mock.calls[0]
    expect(args[5]).toBe('testimony')
  })

  it('submit button label is "Submit Testimony" for testimony', () => {
    renderTestimonyComposer()
    expect(screen.getByRole('button', { name: /submit testimony/i })).toBeInTheDocument()
  })

  it('submit handler bypasses category-required guard for testimony (no category needed)', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(true)
    renderTestimonyComposer({ onSubmit })
    await user.type(screen.getByLabelText('Testimony'), 'My testimony content.')
    await user.click(screen.getByRole('button', { name: /submit testimony/i }))
    // onSubmit IS called — the missing category does NOT block testimony submission.
    expect(onSubmit).toHaveBeenCalled()
    expect(screen.queryByText('Please choose a category')).not.toBeInTheDocument()
  })

  it('crisis keyword detection STILL fires for testimony (R3 — crisis safety preserved)', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(true)
    renderTestimonyComposer({ onSubmit })
    await user.type(screen.getByLabelText('Testimony'), 'I want to kill myself')
    await user.click(screen.getByRole('button', { name: /submit testimony/i }))
    // Crisis block intercepts the submit; onSubmit should NOT be called.
    expect(onSubmit).not.toHaveBeenCalled()
    // Crisis resources are surfaced.
    expect(
      screen.getByText(/sounds like you may be going through a difficult time/i),
    ).toBeInTheDocument()
  })
})

// =====================================================================
// Spec 4.4 — question composer per-type copy + behavior
// =====================================================================

function renderQuestionComposer(overrides?: {
  onSubmit?: Parameters<typeof renderComposer>[0] extends infer T
    ? T extends { onSubmit?: infer S }
      ? S
      : never
    : never
}) {
  return render(
    <MemoryRouter>
      <InlineComposer
        isOpen
        onClose={vi.fn()}
        postType="question"
        onSubmit={overrides?.onSubmit ?? vi.fn().mockResolvedValue(true)}
      />
    </MemoryRouter>,
  )
}

describe('InlineComposer — Spec 4.4 question variant', () => {
  it('renders question header copy', () => {
    renderQuestionComposer()
    expect(screen.getByText('Ask a question')).toBeInTheDocument()
  })

  it('renders question subline below header', () => {
    renderQuestionComposer()
    expect(
      screen.getByText(
        'Other believers can share their experience or scripture they have leaned on.',
      ),
    ).toBeInTheDocument()
  })

  it('does NOT render subline for testimony', () => {
    renderTestimonyComposer()
    expect(
      screen.queryByText(
        'Other believers can share their experience or scripture they have leaned on.',
      ),
    ).not.toBeInTheDocument()
  })

  it('does NOT render subline for prayer_request', () => {
    renderComposer()
    expect(
      screen.queryByText(
        'Other believers can share their experience or scripture they have leaned on.',
      ),
    ).not.toBeInTheDocument()
  })

  it('renders question placeholder', () => {
    renderQuestionComposer()
    expect(
      screen.getByPlaceholderText('What are you wondering about?'),
    ).toBeInTheDocument()
  })

  it('textarea maxLength is 2000 for question', () => {
    renderQuestionComposer()
    expect(screen.getByLabelText('Question')).toHaveAttribute('maxLength', '2000')
  })

  it('category fieldset is hidden for question', () => {
    renderQuestionComposer()
    expect(
      screen.queryByRole('radiogroup', { name: /prayer category/i }),
    ).not.toBeInTheDocument()
  })

  it('challenge prayer checkbox is hidden for question', () => {
    renderQuestionComposer()
    expect(screen.queryByLabelText(/challenge/i)).not.toBeInTheDocument()
  })

  it('attribution nudge does NOT render for question', () => {
    renderQuestionComposer()
    expect(screen.queryByText(/Testimonies often mean more/)).not.toBeInTheDocument()
  })

  it('submit button label is "Submit Question"', () => {
    renderQuestionComposer()
    expect(
      screen.getByRole('button', { name: /submit question/i }),
    ).toBeInTheDocument()
  })
})

// =====================================================================
// Spec 4.5 — discussion composer per-type copy + scripture integration
// =====================================================================

vi.mock('@/data/bible', () => ({
  loadChapterWeb: vi.fn(),
}))

import { loadChapterWeb } from '@/data/bible'
import { waitFor } from '@testing-library/react'

function renderDiscussionComposer(overrides?: {
  onSubmit?: Parameters<typeof renderComposer>[0] extends infer T
    ? T extends { onSubmit?: infer S }
      ? S
      : never
    : never
}) {
  return render(
    <MemoryRouter>
      <InlineComposer
        isOpen
        onClose={vi.fn()}
        postType="discussion"
        onSubmit={overrides?.onSubmit ?? vi.fn().mockResolvedValue(true)}
      />
    </MemoryRouter>,
  )
}

describe('InlineComposer — Spec 4.5 discussion variant', () => {
  it('renders discussion header copy', () => {
    renderDiscussionComposer()
    expect(screen.getByText('Start a discussion')).toBeInTheDocument()
  })

  it('renders discussion placeholder', () => {
    renderDiscussionComposer()
    expect(
      screen.getByPlaceholderText(
        'What scripture or topic do you want to think through with others?',
      ),
    ).toBeInTheDocument()
  })

  it('submit button label is "Start Discussion"', () => {
    renderDiscussionComposer()
    expect(
      screen.getByRole('button', { name: /start discussion/i }),
    ).toBeInTheDocument()
  })

  it('ScriptureReferenceInput renders for discussion postType', () => {
    renderDiscussionComposer()
    expect(
      screen.getByLabelText(/Scripture reference \(optional\)/),
    ).toBeInTheDocument()
  })

  it('ScriptureReferenceInput does NOT render for prayer_request, testimony, question', () => {
    const { unmount: unmount1 } = renderComposer()
    expect(
      screen.queryByLabelText(/Scripture reference \(optional\)/),
    ).not.toBeInTheDocument()
    unmount1()

    const { unmount: unmount2 } = renderTestimonyComposer()
    expect(
      screen.queryByLabelText(/Scripture reference \(optional\)/),
    ).not.toBeInTheDocument()
    unmount2()

    const { unmount: unmount3 } = renderQuestionComposer()
    expect(
      screen.queryByLabelText(/Scripture reference \(optional\)/),
    ).not.toBeInTheDocument()
    unmount3()
  })

  it('discussion submit auto-fills category="discussion" (D15)', async () => {
    vi.mocked(loadChapterWeb).mockResolvedValue(null as never)
    const onSubmit = vi.fn().mockResolvedValue(true)
    const user = userEvent.setup()
    renderDiscussionComposer({ onSubmit })
    await user.type(
      screen.getByLabelText('Discussion'),
      'What does Romans 8:28 mean?',
    )
    await user.click(screen.getByRole('button', { name: /start discussion/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    // 3rd positional arg is `category`
    expect(onSubmit.mock.calls[0][2]).toBe('discussion')
  })

  it('discussion submit payload includes scripture pair when valid', async () => {
    vi.mocked(loadChapterWeb).mockResolvedValue({
      bookSlug: 'romans',
      chapter: 8,
      verses: [
        {
          number: 28,
          text: 'And we know that all things work together for good...',
        },
      ],
      paragraphs: [],
    } as never)
    const onSubmit = vi.fn().mockResolvedValue(true)
    const user = userEvent.setup()
    renderDiscussionComposer({ onSubmit })
    await user.type(
      screen.getByLabelText('Discussion'),
      "What's this passage about?",
    )
    await user.type(screen.getByLabelText(/Scripture reference/), 'Romans 8:28')
    // Wait for debounced lookup + verse-text preview
    await waitFor(
      () =>
        expect(
          screen.getByText(/And we know that all things work together for good/),
        ).toBeInTheDocument(),
      { timeout: 1500 },
    )
    await user.click(screen.getByRole('button', { name: /start discussion/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    const args = onSubmit.mock.calls[0]
    expect(args[6]).toBe('Romans 8:28')
    expect(args[7]).toBe('And we know that all things work together for good...')
  })

  it('discussion submit payload excludes scripture pair when empty', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    const user = userEvent.setup()
    renderDiscussionComposer({ onSubmit })
    await user.type(
      screen.getByLabelText('Discussion'),
      'No scripture this time.',
    )
    await user.click(screen.getByRole('button', { name: /start discussion/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    const args = onSubmit.mock.calls[0]
    expect(args[6]).toBeNull()
    expect(args[7]).toBeNull()
  })

  it('discussion submit DISABLED when scripture is invalid (D12)', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    const user = userEvent.setup()
    renderDiscussionComposer({ onSubmit })
    await user.type(
      screen.getByLabelText('Discussion'),
      'Trying to discuss something.',
    )
    await user.type(screen.getByLabelText(/Scripture reference/), 'Foo 99:99')
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(
      screen.getByRole('button', { name: /start discussion/i }),
    ).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /start discussion/i }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  // Regression: InlineComposer hides on close (aria-hidden/inert) rather than
  // unmounting, so ScriptureReferenceInput's uncontrolled `rawInput` would
  // persist across submit/cancel cycles without a forced remount. Both tests
  // verify the parent's `scriptureResetKey` bump causes the child to remount
  // with empty internal state, keeping the visible field in sync with the
  // parent's cleared scriptureRef/scriptureText.
  it('scripture field clears after successful submit (no stale state on next compose)', async () => {
    vi.mocked(loadChapterWeb).mockResolvedValue({
      bookSlug: 'romans',
      chapter: 8,
      verses: [
        {
          number: 28,
          text: 'We know that all things work together for good for those who love God, for those who are called according to his purpose.',
        },
      ],
      paragraphs: [],
    } as never)
    const onSubmit = vi.fn().mockResolvedValue(true)
    const user = userEvent.setup()
    renderDiscussionComposer({ onSubmit })
    await user.type(screen.getByLabelText('Discussion'), 'A first discussion.')
    const scriptureInput = screen.getByLabelText(/Scripture reference/)
    await user.type(scriptureInput, 'Romans 8:28')
    await waitFor(
      () =>
        expect(
          screen.getByText(/all things work together for good/),
        ).toBeInTheDocument(),
      { timeout: 1500 },
    )

    await user.click(screen.getByRole('button', { name: /start discussion/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())

    // Child remount via `key` bump means a fresh input element is in the DOM.
    // Re-query — the prior element reference is detached.
    expect(
      (screen.getByLabelText(/Scripture reference/) as HTMLInputElement).value,
    ).toBe('')
    expect(
      screen.queryByText(/all things work together for good/),
    ).not.toBeInTheDocument()
  })

  it('scripture field clears after cancel (no stale state on reopen)', async () => {
    vi.mocked(loadChapterWeb).mockResolvedValue({
      bookSlug: 'romans',
      chapter: 8,
      verses: [
        {
          number: 28,
          text: 'We know that all things work together for good for those who love God, for those who are called according to his purpose.',
        },
      ],
      paragraphs: [],
    } as never)
    const user = userEvent.setup()
    renderDiscussionComposer()
    await user.type(screen.getByLabelText(/Scripture reference/), 'Romans 8:28')
    await waitFor(
      () =>
        expect(
          screen.getByText(/all things work together for good/),
        ).toBeInTheDocument(),
      { timeout: 1500 },
    )

    await user.click(screen.getByRole('button', { name: /Cancel/i }))

    expect(
      (screen.getByLabelText(/Scripture reference/) as HTMLInputElement).value,
    ).toBe('')
    expect(
      screen.queryByText(/all things work together for good/),
    ).not.toBeInTheDocument()
  })
})

function renderEncouragementComposer(overrides?: {
  onSubmit?: Parameters<typeof renderComposer>[0] extends infer T
    ? T extends { onSubmit?: infer S }
      ? S
      : never
    : never
}) {
  return render(
    <MemoryRouter>
      <InlineComposer
        isOpen
        onClose={vi.fn()}
        postType="encouragement"
        onSubmit={overrides?.onSubmit ?? vi.fn().mockResolvedValue(true)}
      />
    </MemoryRouter>,
  )
}

describe('InlineComposer — Spec 4.6 encouragement variant', () => {
  it('renders header "Send encouragement"', () => {
    renderEncouragementComposer()
    expect(screen.getByText('Send encouragement')).toBeInTheDocument()
  })

  it('renders the expiry warning callout with Clock icon', () => {
    renderEncouragementComposer()
    const note = screen.getByRole('note')
    expect(note).toHaveTextContent(/gently fade after 24 hours/i)
    // Lucide adds a `lucide-clock` class to the rendered SVG.
    const icon = note.querySelector('svg[aria-hidden="true"]')
    expect(icon).toBeInTheDocument()
    const className = icon!.getAttribute('class') ?? ''
    expect(/lucide-clock/.test(className)).toBe(true)
  })

  it('does NOT render expiry warning for non-encouragement types', () => {
    renderComposer()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('textarea maxLength attribute is 280 for encouragement', () => {
    renderEncouragementComposer()
    const textarea = screen.getByLabelText('Encouragement') as HTMLTextAreaElement
    expect(textarea.maxLength).toBe(280)
  })

  it('CharacterCount appears at 140+ characters (visibleAt threshold)', async () => {
    const user = userEvent.setup()
    renderEncouragementComposer()
    const textarea = screen.getByLabelText('Encouragement')
    // 145 chars puts us above visibleAt=140 but below warningAt=240
    await user.type(textarea, 'a'.repeat(145))
    expect(screen.getByText('145 / 280')).toBeInTheDocument()
  })

  it('anonymous toggle is ABSENT from DOM for encouragement', () => {
    renderEncouragementComposer()
    expect(screen.queryByLabelText(/post anonymously/i)).not.toBeInTheDocument()
  })

  it('category fieldset is ABSENT from DOM for encouragement', () => {
    renderEncouragementComposer()
    expect(screen.queryByText(/^Category$/i)).not.toBeInTheDocument()
  })

  it('challenge checkbox is ABSENT from DOM for encouragement', () => {
    renderEncouragementComposer()
    // Active challenge is mocked as null; the checkbox is also gated by
    // copy.showChallengeCheckbox, which is false for encouragement.
    expect(screen.queryByLabelText(/challenge/i)).not.toBeInTheDocument()
  })

  it('submit button reads "Send Encouragement"', () => {
    renderEncouragementComposer()
    expect(screen.getByText('Send Encouragement')).toBeInTheDocument()
  })

  it('submit payload has category="other" and isAnonymous=false for encouragement', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(true)
    renderEncouragementComposer({ onSubmit })
    await user.type(
      screen.getByLabelText('Encouragement'),
      'Praying you find a quiet moment today.',
    )
    await user.click(screen.getByText('Send Encouragement'))
    expect(onSubmit).toHaveBeenCalledWith(
      'Praying you find a quiet moment today.',
      false, // isAnonymous coerced to false
      'other', // category auto-filled via submitsAsCategory
      undefined,
      expect.any(String),
      'encouragement',
      null, // scriptureReference
      null, // scriptureText
      null, // imageUploadId (Spec 4.6b)
      null, // imageAltText (Spec 4.6b)
      null, // helpTags (Spec 4.7b) — null on encouragement composer
    )
  })
})

// =====================================================================
// Spec 4.6b — image upload affordance (testimony / question only)
// =====================================================================

vi.mock('@/services/api/prayer-wall-api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api/prayer-wall-api')>(
    '@/services/api/prayer-wall-api',
  )
  return { ...actual, uploadImage: vi.fn() }
})

function renderWithPostType(
  postType: 'prayer_request' | 'testimony' | 'question' | 'discussion' | 'encouragement',
) {
  return render(
    <MemoryRouter>
      <InlineComposer
        isOpen
        onClose={vi.fn()}
        postType={postType}
        onSubmit={vi.fn().mockResolvedValue(true)}
      />
    </MemoryRouter>,
  )
}

describe('InlineComposer — Spec 4.6b image upload affordance', () => {
  it('renders the "Add a photo" affordance for testimony composer', () => {
    renderWithPostType('testimony')
    expect(screen.getByRole('button', { name: /add a photo/i })).toBeInTheDocument()
    // Helper text from composerCopyByType.testimony.imageUploadHelperText
    expect(screen.getByText('Add a photo if it tells the story.')).toBeInTheDocument()
  })

  it('renders the "Add a photo" affordance for question composer', () => {
    renderWithPostType('question')
    expect(screen.getByRole('button', { name: /add a photo/i })).toBeInTheDocument()
    expect(
      screen.getByText('A photo can help others understand your question.'),
    ).toBeInTheDocument()
  })

  it('does NOT render the affordance for prayer_request, discussion, or encouragement', () => {
    const { unmount: u1 } = renderWithPostType('prayer_request')
    expect(screen.queryByRole('button', { name: /add a photo/i })).not.toBeInTheDocument()
    u1()

    const { unmount: u2 } = renderWithPostType('discussion')
    expect(screen.queryByRole('button', { name: /add a photo/i })).not.toBeInTheDocument()
    u2()

    renderWithPostType('encouragement')
    expect(screen.queryByRole('button', { name: /add a photo/i })).not.toBeInTheDocument()
  })

  it('disables submit when an image is uploaded but alt text is empty (W9 / D7)', async () => {
    const prayerWallApi = await import('@/services/api/prayer-wall-api')
    const uploadImageMock = vi.mocked(prayerWallApi.uploadImage)
    uploadImageMock.mockResolvedValue({
      uploadId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      full: 'https://signed/full.jpg',
      medium: 'https://signed/medium.jpg',
      thumb: 'https://signed/thumb.jpg',
    })

    const user = userEvent.setup()
    renderWithPostType('testimony')
    await user.type(screen.getByLabelText('Testimony'), 'A real testimony body.')

    // Submit is enabled at this point — no image attached, content is non-empty.
    const submit = screen.getByRole('button', { name: /submit testimony/i })
    expect(submit).not.toBeDisabled()

    // Trigger an upload by selecting a file on the hidden file input.
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await act(async () => {
      const file = new File(['fake'], 'photo.jpg', { type: 'image/jpeg' })
      Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })
      fileInput.dispatchEvent(new Event('change', { bubbles: true }))
    })

    // Alt text input appears once upload resolves. Submit must be disabled
    // until alt text has at least one non-whitespace character (W28).
    const altInput = await screen.findByPlaceholderText(/short description/i)
    expect(submit).toBeDisabled()

    await user.type(altInput, '   ')
    expect(submit).toBeDisabled()

    await user.clear(altInput)
    await user.type(altInput, 'A photo of the answered prayer.')
    expect(submit).not.toBeDisabled()
  })

  // ====================================================================
  // Spec 4.7b — WaysToHelpPicker integration (3 tests)
  // ====================================================================

  it('Spec 4.7b — renders WaysToHelpPicker on prayer_request composer', () => {
    render(
      <MemoryRouter>
        <InlineComposer
          isOpen
          onClose={vi.fn()}
          postType="prayer_request"
          onSubmit={vi.fn().mockResolvedValue(true)}
        />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('ways-to-help-picker')).toBeInTheDocument()
  })

  it('Spec 4.7b — does NOT render WaysToHelpPicker on non-prayer_request composers', () => {
    const types = ['testimony', 'question', 'discussion', 'encouragement'] as const
    for (const postType of types) {
      const { unmount } = render(
        <MemoryRouter>
          <InlineComposer
            isOpen
            onClose={vi.fn()}
            postType={postType}
            onSubmit={vi.fn().mockResolvedValue(true)}
          />
        </MemoryRouter>,
      )
      expect(screen.queryByTestId('ways-to-help-picker')).not.toBeInTheDocument()
      unmount()
    }
  })

  it('Spec 4.7b — submit payload includes helpTags array when chips selected', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <InlineComposer
          isOpen
          onClose={vi.fn()}
          postType="prayer_request"
          onSubmit={onSubmit}
        />
      </MemoryRouter>,
    )

    // Type content + select category (prayer_request requires category).
    const textarea = screen.getByLabelText('Prayer request')
    await user.type(textarea, 'Please pray.')
    // Click the Family category chip.
    await user.click(screen.getByText('Family'))
    // Select the Meals help tag chip — scope to the picker so we don't pick
    // up a same-named category button.
    const picker = screen.getByTestId('ways-to-help-picker')
    await user.click(within(picker).getByRole('button', { name: 'Meals' }))
    // Submit.
    await user.click(screen.getByText('Submit Prayer Request'))

    // Use toHaveBeenCalledWith for full-arg verification (matches the pattern
    // elsewhere in this file). helpTags is the 11th positional arg.
    expect(onSubmit).toHaveBeenCalledWith(
      'Please pray.',          // content
      false,                   // isAnonymous
      'family',                // category
      undefined,               // challengeId — undefined when no active challenge
      expect.any(String),      // idempotencyKey (UUID)
      'prayer_request',        // postType
      null,                    // scriptureReference
      null,                    // scriptureText
      null,                    // imageUploadId (Spec 4.6b)
      null,                    // imageAltText (Spec 4.6b)
      ['meals'],               // helpTags (Spec 4.7b)
    )
  })

  it('renders FrostedCard with canonical radius inside the composer panel', () => {
    const { container } = renderComposer({ isOpen: true, postType: 'prayer_request' })
    expect(container.querySelector('[class*="rounded-3xl"]')).toBeInTheDocument()
  })
})
