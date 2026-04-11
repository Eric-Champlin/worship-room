import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockUseReflectOnPassage, mockGenerateReflection } = vi.hoisted(() => ({
  mockUseReflectOnPassage: vi.fn(),
  mockGenerateReflection: vi.fn(),
}))

vi.mock('@/hooks/bible/useReflectOnPassage', async () => {
  const actual = await vi.importActual<
    typeof import('@/hooks/bible/useReflectOnPassage')
  >('@/hooks/bible/useReflectOnPassage')
  return {
    ...actual,
    useReflectOnPassage: (ref: string, text: string) =>
      mockUseReflectOnPassage(ref, text),
  }
})

vi.mock('@/lib/ai/geminiClient', () => ({
  generateReflection: (...args: unknown[]) => mockGenerateReflection(...args),
}))

// Stub reduced motion so the skeleton renders deterministically
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}))

import { ReflectSubView } from '../ReflectSubView'
import type { VerseSelection } from '@/types/verse-actions'
import type { ReflectErrorKind } from '@/hooks/bible/useReflectOnPassage'

const SMALL_SELECTION: VerseSelection = {
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

function mockState(
  status: 'loading' | 'success' | 'error',
  opts: {
    content?: string
    errorKind?: ReflectErrorKind
    errorMessage?: string
    retry?: () => void
  } = {},
) {
  mockUseReflectOnPassage.mockReturnValue({
    status,
    result:
      status === 'success'
        ? { content: opts.content ?? 'test content', model: 'gemini-2.5-flash-lite' }
        : null,
    errorKind: status === 'error' ? opts.errorKind ?? null : null,
    errorMessage: status === 'error' ? opts.errorMessage ?? null : null,
    retry: opts.retry ?? vi.fn(),
  })
}

beforeEach(() => {
  mockUseReflectOnPassage.mockReset()
  mockGenerateReflection.mockReset()
})

describe('ReflectSubView — structural', () => {
  it('renders "Reflection for {reference}" subtitle', () => {
    mockState('loading')
    render(<ReflectSubView selection={SMALL_SELECTION} onBack={vi.fn()} />)
    expect(screen.getByText(/Reflection for 1 Corinthians 13:4/)).toBeInTheDocument()
  })

  it('renders reference and verse text in the Tier 2 context strip', () => {
    mockState('loading')
    const { container } = render(
      <ReflectSubView selection={SMALL_SELECTION} onBack={vi.fn()} />,
    )
    expect(container.textContent).toContain('1 Corinthians 13:4')
    expect(container.textContent).toContain('Love is patient')
  })

  it('applies the Tier 2 callout class string', () => {
    mockState('loading')
    const { container } = render(
      <ReflectSubView selection={SMALL_SELECTION} onBack={vi.fn()} />,
    )
    const callout = container.querySelector('.border-l-primary\\/60')
    expect(callout).not.toBeNull()
    expect(callout?.className).toContain('rounded-xl')
    expect(callout?.className).toContain('border-l-4')
    expect(callout?.className).toContain('bg-white/[0.04]')
  })

  it('component body starts with a plain div (no self-rendered back button)', () => {
    mockState('loading')
    const { container } = render(
      <ReflectSubView selection={SMALL_SELECTION} onBack={vi.fn()} />,
    )
    expect(container.firstChild?.nodeName).toBe('DIV')
    expect(screen.queryByRole('button', { name: /^back$/i })).toBeNull()
  })

  it('component body does not contain a self-rendered close X button', () => {
    mockState('loading')
    render(<ReflectSubView selection={SMALL_SELECTION} onBack={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull()
  })

  it('renders without needing an AuthModalProvider wrapper (zero auth)', () => {
    // This test would throw if the component called useAuth / useAuthModal
    // without a provider. The fact that bare render() works proves zero auth
    // calls in the component tree.
    mockState('loading')
    expect(() =>
      render(<ReflectSubView selection={SMALL_SELECTION} onBack={vi.fn()} />),
    ).not.toThrow()
  })

  it('does not write to localStorage during render', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    mockState('loading')
    render(<ReflectSubView selection={SMALL_SELECTION} onBack={vi.fn()} />)
    expect(setItemSpy).not.toHaveBeenCalled()
    setItemSpy.mockRestore()
  })
})

describe('ReflectSubView — loading state', () => {
  it('renders the Thinking label (reuses ExplainSubViewLoading)', () => {
    mockState('loading')
    render(<ReflectSubView selection={SMALL_SELECTION} onBack={vi.fn()} />)
    expect(screen.getByText('Thinking…')).toBeInTheDocument()
  })

  it('does NOT render the disclaimer during loading', () => {
    mockState('loading')
    render(<ReflectSubView selection={SMALL_SELECTION} onBack={vi.fn()} />)
    expect(
      screen.queryByText(/This reflection was generated by an AI/),
    ).toBeNull()
  })
})

describe('ReflectSubView — success state', () => {
  it('renders the reflection body', () => {
    mockState('success', {
      content: 'A reader might find themselves wondering what it would mean to...',
    })
    render(<ReflectSubView selection={SMALL_SELECTION} onBack={vi.fn()} />)
    expect(
      screen.getByText(/A reader might find themselves wondering/),
    ).toBeInTheDocument()
  })

  it('renders the ReflectSubViewDisclaimer below the body on success', () => {
    mockState('success', { content: 'test' })
    render(<ReflectSubView selection={SMALL_SELECTION} onBack={vi.fn()} />)
    expect(
      screen.getByText(/This reflection was generated by an AI/),
    ).toBeInTheDocument()
    // Load-bearing phrase
    expect(screen.getByText(/maybe not your way/)).toBeInTheDocument()
  })

  it('applies the body text class string', () => {
    mockState('success', { content: 'A reader might ask' })
    const { container } = render(
      <ReflectSubView selection={SMALL_SELECTION} onBack={vi.fn()} />,
    )
    const body = container.querySelector('.whitespace-pre-wrap')
    expect(body).not.toBeNull()
    expect(body?.className).toContain('text-[15px]')
    expect(body?.className).toContain('leading-[1.7]')
    expect(body?.className).toContain('text-white/90')
  })

  it('escapes HTML in content (no dangerouslySetInnerHTML)', () => {
    mockState('success', { content: '<script>alert(1)</script>' })
    const { container } = render(
      <ReflectSubView selection={SMALL_SELECTION} onBack={vi.fn()} />,
    )
    expect(container.textContent).toContain('<script>alert(1)</script>')
    expect(container.querySelector('script')).toBeNull()
  })
})

describe('ReflectSubView — error states', () => {
  it('renders network error copy and retry button', () => {
    mockState('error', {
      errorKind: 'network',
      errorMessage:
        "Couldn't load an explanation right now. Check your connection and try again.",
    })
    render(<ReflectSubView selection={SMALL_SELECTION} onBack={vi.fn()} />)
    expect(screen.getByText(/Couldn't load/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('clicking retry calls the hook retry function', async () => {
    const retry = vi.fn()
    mockState('error', {
      errorKind: 'network',
      errorMessage: 'x',
      retry,
    })
    const user = userEvent.setup()
    render(<ReflectSubView selection={SMALL_SELECTION} onBack={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('does NOT render the disclaimer in error state', () => {
    mockState('error', { errorKind: 'api', errorMessage: 'x' })
    render(<ReflectSubView selection={SMALL_SELECTION} onBack={vi.fn()} />)
    expect(
      screen.queryByText(/This reflection was generated by an AI/),
    ).toBeNull()
  })
})

describe('ReflectSubView — 20-verse cap', () => {
  it('over-limit selection shows "reflect on" over-limit copy without firing the hook', () => {
    const largeSelection: VerseSelection = {
      ...SMALL_SELECTION,
      startVerse: 1,
      endVerse: 25,
      verses: Array.from({ length: 25 }, (_, i) => ({
        number: i + 1,
        text: `Verse ${i + 1} text.`,
      })),
    }

    mockState('loading')
    render(<ReflectSubView selection={largeSelection} onBack={vi.fn()} />)

    expect(
      screen.getByText(/Please select 20 or fewer verses to reflect on/),
    ).toBeInTheDocument()

    // Hook was called with empty strings (rules-of-hooks guard)
    expect(mockUseReflectOnPassage).toHaveBeenCalledWith('', '')
    expect(mockGenerateReflection).not.toHaveBeenCalled()
  })

  it('at-limit selection (exactly 20) does fire the hook with real args', () => {
    const atLimit: VerseSelection = {
      ...SMALL_SELECTION,
      startVerse: 1,
      endVerse: 20,
      verses: Array.from({ length: 20 }, (_, i) => ({
        number: i + 1,
        text: `v${i + 1}`,
      })),
    }
    mockState('loading')
    render(<ReflectSubView selection={atLimit} onBack={vi.fn()} />)

    const [[ref, text]] = mockUseReflectOnPassage.mock.calls
    expect(ref).not.toBe('')
    expect(text).not.toBe('')
  })

  it('single-verse selection fires the hook', () => {
    const singleVerse: VerseSelection = {
      ...SMALL_SELECTION,
      startVerse: 4,
      endVerse: 4,
      verses: [{ number: 4, text: 'Love is patient.' }],
    }
    mockState('loading')
    render(<ReflectSubView selection={singleVerse} onBack={vi.fn()} />)

    const [[ref, text]] = mockUseReflectOnPassage.mock.calls
    expect(ref).toContain('1 Corinthians 13:4')
    expect(text).toBe('Love is patient.')
  })
})
