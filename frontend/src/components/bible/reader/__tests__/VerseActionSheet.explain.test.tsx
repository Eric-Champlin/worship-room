import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import type { VerseSelection } from '@/types/verse-actions'
import type { DeepLinkableAction } from '@/lib/url/validateAction'

// ---------------------------------------------------------------------------
// Mocks — mirror VerseActionSheet.test.tsx baseline
// ---------------------------------------------------------------------------

const { mockGenerateExplanation } = vi.hoisted(() => ({
  mockGenerateExplanation: vi.fn(),
}))

// Mock the Gemini client at the boundary above the hook so the full
// hook → client error classification chain is exercised.
vi.mock('@/lib/ai/geminiClient', () => ({
  generateExplanation: (...args: unknown[]) => mockGenerateExplanation(...args),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}))

vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ current: null }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@/data/bible', () => ({
  getBookBySlug: vi.fn((slug: string) => ({ name: slug, slug })),
  loadChapterWeb: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/bible/crossRefs/loader', () => ({
  loadCrossRefsForBook: vi.fn().mockResolvedValue(new Map()),
  collectCrossRefsForRange: vi.fn().mockReturnValue([]),
  getCachedBook: vi.fn().mockReturnValue(null),
  getDeduplicatedCrossRefCount: vi.fn().mockReturnValue(0),
}))

import { VerseActionSheet } from '../VerseActionSheet'
import {
  GeminiNetworkError,
  GeminiSafetyBlockError,
} from '@/lib/ai/errors'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const SELECTION: VerseSelection = {
  book: '1-corinthians',
  bookName: '1 Corinthians',
  chapter: 13,
  startVerse: 4,
  endVerse: 7,
  verses: [
    { number: 4, text: 'Love is patient and is kind.' },
    { number: 5, text: "doesn't behave itself inappropriately." },
    { number: 6, text: "doesn't rejoice in unrighteousness." },
    { number: 7, text: 'bears all things.' },
  ],
}

// BB-38: Stateful wrapper — tests click Explain button, `onOpenAction` callback
// updates local state, sub-view mounts via the updated `action` prop.
function SheetWithState({ selection }: { selection: VerseSelection }) {
  const [action, setAction] = useState<DeepLinkableAction | null>(null)
  return (
    <VerseActionSheet
      selection={selection}
      isOpen
      onClose={vi.fn()}
      onExtendSelection={vi.fn()}
      action={action}
      onOpenAction={setAction}
      onCloseAction={() => setAction(null)}
    />
  )
}

function renderSheet(selection: VerseSelection = SELECTION) {
  return render(<SheetWithState selection={selection} />)
}

beforeEach(() => {
  mockGenerateExplanation.mockReset()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VerseActionSheet — Explain this passage', () => {
  it('opens the ExplainSubView when the action is clicked', async () => {
    mockGenerateExplanation.mockResolvedValue({
      content: 'Paul is writing to a factional Corinthian church.',
      model: 'gemini-2.5-flash-lite',
    })

    const user = userEvent.setup()
    renderSheet()

    await user.click(
      screen.getByRole('button', { name: /explain this passage/i }),
    )

    // Sheet chrome (back + title) is rendered by VerseActionSheet
    // The sub-view subtitle confirms ExplainSubView mounted
    expect(
      screen.getByText(/Scholarly context for 1 Corinthians 13:4/),
    ).toBeInTheDocument()
  })

  it('fires generateExplanation on sub-view mount', async () => {
    mockGenerateExplanation.mockResolvedValue({
      content: 'Test explanation.',
      model: 'gemini-2.5-flash-lite',
    })

    const user = userEvent.setup()
    renderSheet()

    await user.click(
      screen.getByRole('button', { name: /explain this passage/i }),
    )

    await waitFor(() => {
      expect(mockGenerateExplanation).toHaveBeenCalledWith(
        expect.stringContaining('1 Corinthians 13:4'),
        expect.stringContaining('Love is patient'),
        expect.any(AbortSignal),
      )
    })
  })

  it('renders the explanation and disclaimer on success', async () => {
    mockGenerateExplanation.mockResolvedValue({
      content:
        'Paul is writing to a factional Corinthian church, not a wedding audience.',
      model: 'gemini-2.5-flash-lite',
    })

    const user = userEvent.setup()
    renderSheet()

    await user.click(
      screen.getByRole('button', { name: /explain this passage/i }),
    )

    await waitFor(() => {
      expect(
        screen.getByText(
          /Paul is writing to a factional Corinthian church/,
        ),
      ).toBeInTheDocument()
    })
    expect(
      screen.getByText(/This explanation was generated by an AI/),
    ).toBeInTheDocument()
  })

  it('shows the network error state when generateExplanation rejects with GeminiNetworkError', async () => {
    mockGenerateExplanation.mockRejectedValue(new GeminiNetworkError())

    const user = userEvent.setup()
    renderSheet()

    await user.click(
      screen.getByRole('button', { name: /explain this passage/i }),
    )

    await waitFor(() => {
      expect(
        screen.getByText(/Couldn't load an explanation right now/),
      ).toBeInTheDocument()
    })
    expect(
      screen.getByRole('button', { name: /try again/i }),
    ).toBeInTheDocument()
  })

  it('shows the safety block error state', async () => {
    mockGenerateExplanation.mockRejectedValue(new GeminiSafetyBlockError())

    const user = userEvent.setup()
    renderSheet()

    await user.click(
      screen.getByRole('button', { name: /explain this passage/i }),
    )

    await waitFor(() => {
      expect(
        screen.getByText(/This passage is too difficult for our AI helper/),
      ).toBeInTheDocument()
    })
  })

  it('retry button re-fires generateExplanation', async () => {
    mockGenerateExplanation.mockRejectedValueOnce(new GeminiNetworkError())
    mockGenerateExplanation.mockResolvedValueOnce({
      content: 'Retry succeeded.',
      model: 'gemini-2.5-flash-lite',
    })

    const user = userEvent.setup()
    renderSheet()

    await user.click(
      screen.getByRole('button', { name: /explain this passage/i }),
    )

    await waitFor(() => {
      expect(screen.getByText(/Couldn't load/)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /try again/i }))

    await waitFor(() => {
      expect(screen.getByText('Retry succeeded.')).toBeInTheDocument()
    })
    expect(mockGenerateExplanation).toHaveBeenCalledTimes(2)
  })

  it('20-verse cap shows an error without calling generateExplanation', async () => {
    const largeSelection: VerseSelection = {
      ...SELECTION,
      startVerse: 1,
      endVerse: 25,
      verses: Array.from({ length: 25 }, (_, i) => ({
        number: i + 1,
        text: `Verse ${i + 1} text.`,
      })),
    }

    const user = userEvent.setup()
    renderSheet(largeSelection)

    await user.click(
      screen.getByRole('button', { name: /explain this passage/i }),
    )

    expect(
      screen.getByText(/Please select 20 or fewer verses/),
    ).toBeInTheDocument()
    expect(mockGenerateExplanation).not.toHaveBeenCalled()
  })
})
