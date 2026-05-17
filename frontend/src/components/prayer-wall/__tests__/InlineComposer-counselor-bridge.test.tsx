import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { InlineComposer } from '../InlineComposer'
import type { PrayerCategory } from '@/constants/prayer-categories'
import type { PostType } from '@/constants/post-types'

// Mirror the canonical mock surface from InlineComposer.test.tsx so the
// composer mounts cleanly without dragging in the real challenge calendar,
// unsaved-changes modal, or night-mode time check. useComposerDraft and
// useOnlineStatus stay real (jsdom backing).
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

vi.mock('@/hooks/useNightMode', () => ({
  useNightMode: vi.fn(() => ({
    active: false,
    source: 'auto' as const,
    userPreference: 'auto' as const,
  })),
}))

function renderComposer(overrides?: {
  postType?: PostType
  onSubmit?: (
    content: string,
    isAnonymous: boolean,
    category: PrayerCategory | null,
    challengeId?: string,
    idempotencyKey?: string,
  ) => boolean | Promise<boolean>
}) {
  const onSubmit =
    overrides?.onSubmit ?? vi.fn().mockResolvedValue(true)
  const onClose = vi.fn()
  const utils = render(
    <MemoryRouter>
      <InlineComposer
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
        postType={overrides?.postType ?? 'prayer_request'}
      />
    </MemoryRouter>,
  )
  return { onSubmit, onClose, ...utils }
}

describe('InlineComposer — counselor bridge (Spec 7.5)', () => {
  beforeEach(() => {
    sessionStorage.clear()
    // The real useComposerDraft uses localStorage; clear so stale drafts
    // from previous tests don't surface the RestoreDraftPrompt.
    localStorage.clear()
  })

  it('renders the bridge when postType=prayer_request AND category=mental-health', () => {
    renderComposer()
    expect(screen.queryByTestId('counselor-bridge')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Mental Health' }))
    expect(screen.getByTestId('counselor-bridge')).toBeInTheDocument()
  })

  it('does NOT render the bridge when category is not mental-health', () => {
    renderComposer()
    fireEvent.click(screen.getByRole('radio', { name: 'Health' }))
    expect(screen.queryByTestId('counselor-bridge')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Family' }))
    expect(screen.queryByTestId('counselor-bridge')).not.toBeInTheDocument()
  })

  it('does NOT render the bridge when postType is not prayer_request (testimony has no category fieldset, so this is architecturally enforced)', () => {
    renderComposer({ postType: 'testimony' })
    // Testimony composer has no category fieldset, so the Mental Health
    // radio is simply not in the DOM. Bridge never has a chance to render.
    expect(
      screen.queryByRole('radio', { name: 'Mental Health' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByTestId('counselor-bridge')).not.toBeInTheDocument()
  })

  it('Gate-G-PERSISTENT-DISMISSAL-WITHIN-SESSION: bridge does NOT re-render after dismissal + category-toggle round-trip', () => {
    renderComposer()
    fireEvent.click(screen.getByRole('radio', { name: 'Mental Health' }))
    expect(screen.getByTestId('counselor-bridge')).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: /Dismiss counselor suggestion/i }),
    )
    expect(screen.queryByTestId('counselor-bridge')).not.toBeInTheDocument()
    // Toggle away and back; sessionStorage flag persists.
    fireEvent.click(screen.getByRole('radio', { name: 'Family' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Mental Health' }))
    expect(screen.queryByTestId('counselor-bridge')).not.toBeInTheDocument()
  })

  it('Gate-G-NO-CRISIS-UI-CONFLICT: bridge and crisis-resources banner can render together', () => {
    const { onSubmit } = renderComposer()
    fireEvent.click(screen.getByRole('radio', { name: 'Mental Health' }))
    expect(screen.getByTestId('counselor-bridge')).toBeInTheDocument()

    // Type crisis keywords + submit so the crisis banner appears.
    const textarea = screen.getByRole('textbox', { name: /Prayer request/i })
    fireEvent.change(textarea, {
      target: { value: 'I want to kill myself.' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: /Submit Prayer Request/i }),
    )

    // Crisis banner copy from InlineComposer.tsx:740-770.
    expect(
      screen.getByText(/sounds like you may be going through a difficult time/i),
    ).toBeInTheDocument()
    // Bridge is STILL visible (R5 default — both render simultaneously).
    expect(screen.getByTestId('counselor-bridge')).toBeInTheDocument()
    // onSubmit was NOT called (crisis detection blocks submission).
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
