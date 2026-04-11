import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { VerseSelection } from '@/types/verse-actions'

// ---------------------------------------------------------------------------
// Mocks — mirror VerseActionSheet.explain.test.tsx baseline
// ---------------------------------------------------------------------------

const { mockGenerateExplanation, mockGenerateReflection } = vi.hoisted(() => ({
  mockGenerateExplanation: vi.fn(),
  mockGenerateReflection: vi.fn(),
}))

// Mock the Gemini client at the boundary above the hook so the full
// hook → client error classification chain is exercised. BOTH functions must
// be exported because the registry imports ExplainSubView (which imports
// generateExplanation via its hook) alongside ReflectSubView.
vi.mock('@/lib/ai/geminiClient', () => ({
  generateExplanation: (...args: unknown[]) => mockGenerateExplanation(...args),
  generateReflection: (...args: unknown[]) => mockGenerateReflection(...args),
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
  GeminiTimeoutError,
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

function renderSheet(selection: VerseSelection = SELECTION) {
  return render(
    <VerseActionSheet
      selection={selection}
      isOpen
      onClose={vi.fn()}
      onExtendSelection={vi.fn()}
    />,
  )
}

beforeEach(() => {
  mockGenerateExplanation.mockReset()
  mockGenerateReflection.mockReset()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VerseActionSheet — Reflect on this passage', () => {
  it('renders the "Reflect on this passage" action in the sheet', () => {
    renderSheet()
    expect(
      screen.getByRole('button', { name: /reflect on this passage/i }),
    ).toBeInTheDocument()
  })

  it('opens the ReflectSubView when the action is clicked', async () => {
    mockGenerateReflection.mockResolvedValue({
      content: 'A reader might ask what it would mean to hold this gently.',
      model: 'gemini-2.5-flash-lite',
    })

    const user = userEvent.setup()
    renderSheet()

    await user.click(
      screen.getByRole('button', { name: /reflect on this passage/i }),
    )

    // The sub-view subtitle confirms ReflectSubView mounted
    expect(
      screen.getByText(/Reflection for 1 Corinthians 13:4/),
    ).toBeInTheDocument()
  })

  it('fires generateReflection (not generateExplanation) on sub-view mount', async () => {
    mockGenerateReflection.mockResolvedValue({
      content: 'Test reflection.',
      model: 'gemini-2.5-flash-lite',
    })

    const user = userEvent.setup()
    renderSheet()

    await user.click(
      screen.getByRole('button', { name: /reflect on this passage/i }),
    )

    await waitFor(() => {
      expect(mockGenerateReflection).toHaveBeenCalledWith(
        expect.stringContaining('1 Corinthians 13:4'),
        expect.stringContaining('Love is patient'),
        expect.any(AbortSignal),
      )
    })
    // Importantly: clicking Reflect must NOT fire the Explain client
    expect(mockGenerateExplanation).not.toHaveBeenCalled()
  })

  it('renders the reflection body and ReflectSubViewDisclaimer on success', async () => {
    mockGenerateReflection.mockResolvedValue({
      content:
        'A reader might find themselves wondering what it would mean to hold this passage gently.',
      model: 'gemini-2.5-flash-lite',
    })

    const user = userEvent.setup()
    renderSheet()

    await user.click(
      screen.getByRole('button', { name: /reflect on this passage/i }),
    )

    await waitFor(() => {
      expect(
        screen.getByText(/A reader might find themselves wondering/),
      ).toBeInTheDocument()
    })

    // Disclaimer with exact load-bearing phrase
    expect(
      screen.getByText(
        /This reflection was generated by an AI\. It's one way this passage might land — not the only way, not the best way, and maybe not your way\./,
      ),
    ).toBeInTheDocument()
  })

  it('shows the network error state when generateReflection rejects with GeminiNetworkError', async () => {
    mockGenerateReflection.mockRejectedValue(new GeminiNetworkError())

    const user = userEvent.setup()
    renderSheet()

    await user.click(
      screen.getByRole('button', { name: /reflect on this passage/i }),
    )

    await waitFor(() => {
      expect(screen.getByText(/Couldn't load/)).toBeInTheDocument()
    })
    expect(
      screen.getByRole('button', { name: /try again/i }),
    ).toBeInTheDocument()
  })

  it('shows the safety-block error copy', async () => {
    mockGenerateReflection.mockRejectedValue(new GeminiSafetyBlockError())

    const user = userEvent.setup()
    renderSheet()

    await user.click(
      screen.getByRole('button', { name: /reflect on this passage/i }),
    )

    await waitFor(() => {
      expect(
        screen.getByText(/too difficult for our AI helper/),
      ).toBeInTheDocument()
    })
  })

  it('shows the timeout error copy', async () => {
    mockGenerateReflection.mockRejectedValue(new GeminiTimeoutError())

    const user = userEvent.setup()
    renderSheet()

    await user.click(
      screen.getByRole('button', { name: /reflect on this passage/i }),
    )

    await waitFor(() => {
      expect(screen.getByText(/took too long/)).toBeInTheDocument()
    })
  })

  it('retry button re-fires generateReflection', async () => {
    mockGenerateReflection.mockRejectedValueOnce(new GeminiNetworkError())
    mockGenerateReflection.mockResolvedValueOnce({
      content: 'Retry succeeded with a reflection.',
      model: 'gemini-2.5-flash-lite',
    })

    const user = userEvent.setup()
    renderSheet()

    await user.click(
      screen.getByRole('button', { name: /reflect on this passage/i }),
    )

    await waitFor(() => {
      expect(screen.getByText(/Couldn't load/)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /try again/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Retry succeeded with a reflection.'),
      ).toBeInTheDocument()
    })
    expect(mockGenerateReflection).toHaveBeenCalledTimes(2)
  })

  it('20-verse cap shows "reflect on" over-limit error without calling generateReflection', async () => {
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
      screen.getByRole('button', { name: /reflect on this passage/i }),
    )

    expect(
      screen.getByText(/Please select 20 or fewer verses to reflect on/),
    ).toBeInTheDocument()
    expect(mockGenerateReflection).not.toHaveBeenCalled()
  })

  it('Explain and Reflect coexist — both action buttons appear in the sheet', () => {
    renderSheet()
    expect(
      screen.getByRole('button', { name: /explain this passage/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /reflect on this passage/i }),
    ).toBeInTheDocument()
  })
})
