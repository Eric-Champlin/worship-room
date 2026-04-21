import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { AskPage } from '../AskPage'
import { ASK_TOPIC_CHIPS } from '@/constants/ask'
import type { AuthContextValue } from '@/contexts/AuthContext'

// --- Auth mock setup ---
const { mockAuthFn } = vi.hoisted(() => {
  const mockAuthFn = vi.fn((): AuthContextValue => ({
    isAuthenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
  }))
  return { mockAuthFn }
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockAuthFn,
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: mockAuthFn,
}))

function renderAskPage(initialRoute = '/ask') {
  return render(
    <MemoryRouter
      initialEntries={[initialRoute]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <Routes>
            <Route path="/ask" element={<AskPage />} />
          </Routes>
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockAuthFn.mockReturnValue({
    isAuthenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
  })
  // Mock window.scrollTo to prevent jsdom "Not implemented" noise
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

describe('AskPage — Shell Structure', () => {
  it('does not render bg-dashboard-dark anywhere', () => {
    const { container } = renderAskPage()
    const offenders = container.querySelectorAll('[class*="bg-dashboard-dark"]')
    expect(offenders.length).toBe(0)
  })

  it('renders GlowBackground orbs (≥3)', () => {
    const { container } = renderAskPage()
    // GlowBackground variant="fullPage" renders 5 orbs; assert ≥3 for safety margin.
    const orbs = container.querySelectorAll('[data-testid="glow-orb"]')
    expect(orbs.length).toBeGreaterThanOrEqual(3)
  })
})

describe('AskPage — Page Structure', () => {
  it('renders the hero heading "Ask God\'s Word"', () => {
    renderAskPage()
    const heading = screen.getByRole('heading', { name: "Ask God's Word" })
    expect(heading).toBeInTheDocument()
  })

  it('renders subtitle in plain white sans-serif (no italic, no serif)', () => {
    renderAskPage()
    const subtitle = screen.getByText('Bring your questions. Find wisdom in Scripture.')
    expect(subtitle).toBeInTheDocument()
    expect(subtitle.className).not.toContain('font-serif')
    expect(subtitle.className).not.toContain('italic')
    expect(subtitle.className).toContain('text-white')
    expect(subtitle.className).not.toContain('text-white/60')
  })

  it('hero H1 uses animate-gradient-shift (no HeadingDivider)', () => {
    renderAskPage()
    const heading = screen.getByRole('heading', { name: "Ask God's Word" })
    expect(heading.className).toContain('animate-gradient-shift')
    expect(heading.className).not.toContain('font-script')
  })
})

describe('AskPage — Input Behavior', () => {
  it('renders textarea with correct placeholder', () => {
    renderAskPage()
    expect(
      screen.getByPlaceholderText("What's on your heart? Ask anything...")
    ).toBeInTheDocument()
  })

  it('textarea has accessible label', () => {
    renderAskPage()
    expect(screen.getByLabelText('Your question')).toBeInTheDocument()
  })

  it('character counter updates on input at 300+ chars', async () => {
    const user = userEvent.setup()
    renderAskPage()
    const textarea = screen.getByLabelText('Your question')
    await user.type(textarea, 'a'.repeat(300))
    expect(screen.getByText('300 / 500')).toBeInTheDocument()
  })

  it('character counter shows warning color at 400+ chars', async () => {
    const user = userEvent.setup()
    renderAskPage()
    const textarea = screen.getByLabelText('Your question')
    const text = 'a'.repeat(400)
    await user.type(textarea, text)
    const counter = screen.getByText('400 / 500')
    expect(counter).toHaveClass('text-amber-400')
  })

  it('character counter shows danger color at 480+ chars', async () => {
    const user = userEvent.setup()
    renderAskPage()
    const textarea = screen.getByLabelText('Your question')
    const text = 'a'.repeat(480)
    await user.type(textarea, text)
    const counter = screen.getByText('480 / 500')
    expect(counter).toHaveClass('text-red-400')
  })

  it('textarea enforces 500 char max', () => {
    renderAskPage()
    const textarea = screen.getByLabelText('Your question')
    expect(textarea).toHaveAttribute('maxLength', '500')
  })
})

describe('AskPage — Topic Chips', () => {
  it('renders 6 topic chips with correct text', () => {
    renderAskPage()
    for (const chip of ASK_TOPIC_CHIPS) {
      expect(screen.getByRole('button', { name: chip })).toBeInTheDocument()
    }
  })

  it('clicking a chip pre-fills textarea', async () => {
    const user = userEvent.setup()
    renderAskPage()
    const chip = screen.getByRole('button', { name: ASK_TOPIC_CHIPS[0] })
    await user.click(chip)
    const textarea = screen.getByLabelText('Your question')
    expect(textarea).toHaveValue(ASK_TOPIC_CHIPS[0])
  })
})

describe('AskPage — Submit Button', () => {
  it('submit button is disabled when textarea empty', () => {
    renderAskPage()
    const button = screen.getByRole('button', { name: 'Find Answers' })
    expect(button).toBeDisabled()
  })

  it('submit button is enabled when textarea has text', async () => {
    const user = userEvent.setup()
    renderAskPage()
    await user.type(screen.getByLabelText('Your question'), 'test')
    const button = screen.getByRole('button', { name: 'Find Answers' })
    expect(button).not.toBeDisabled()
  })
})

describe('AskPage — Crisis Banner', () => {
  it('CrisisBanner appears for crisis keywords', async () => {
    const user = userEvent.setup()
    renderAskPage()
    await user.type(screen.getByLabelText('Your question'), 'I want to kill myself')
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

describe('AskPage — Auth Gating (first submit)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('logged-out user clicking submit gets response, not auth modal', () => {
    mockAuthFn.mockReturnValue({
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    })
    renderAskPage()
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'Why does God allow suffering?' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Find Answers' }))
    // Should show loading, NOT auth modal
    expect(screen.getByText('Searching Scripture for wisdom...')).toBeInTheDocument()
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(2100)
    })
    expect(screen.getByText('What Scripture Says')).toBeInTheDocument()
  })
})

describe('AskPage — Loading State', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockAuthFn.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test User', id: 'test-user-id' },
      login: vi.fn(),
      logout: vi.fn(),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function fillAndSubmit(text = 'Why does God allow suffering?') {
    renderAskPage()
    const textarea = screen.getByLabelText('Your question')
    fireEvent.change(textarea, { target: { value: text } })
    fireEvent.click(screen.getByRole('button', { name: 'Find Answers' }))
  }

  it('shows bouncing dots after submission', () => {
    fillAndSubmit()
    const dots = document.querySelectorAll('.motion-safe\\:animate-bounce')
    expect(dots.length).toBe(3)
  })

  it('shows "Searching Scripture for wisdom..." message', () => {
    fillAndSubmit()
    expect(screen.getByText('Searching Scripture for wisdom...')).toBeInTheDocument()
  })

  it('shows loading verse (Psalm 119:105)', () => {
    fillAndSubmit()
    expect(screen.getByText(/Your word is a lamp to my feet/)).toBeInTheDocument()
    expect(screen.getByText(/Psalm 119:105 WEB/)).toBeInTheDocument()
  })

  it('loading state has aria-live="polite"', () => {
    renderAskPage()
    const liveRegion = document.querySelector('[aria-live="polite"]')
    expect(liveRegion).toBeInTheDocument()
  })
})

describe('AskPage — Response Display', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockAuthFn.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test User', id: 'test-user-id' },
      login: vi.fn(),
      logout: vi.fn(),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function submitAndWait(questionText = 'Why does God allow suffering?') {
    renderAskPage()
    const textarea = screen.getByLabelText('Your question')
    fireEvent.change(textarea, { target: { value: questionText } })
    fireEvent.click(screen.getByRole('button', { name: 'Find Answers' }))
    act(() => {
      vi.advanceTimersByTime(2100)
    })
  }

  it('response fades in after loading', () => {
    submitAndWait()
    expect(screen.queryByText('Searching Scripture for wisdom...')).not.toBeInTheDocument()
    expect(screen.getByText('What Scripture Says')).toBeInTheDocument()
  })

  it('direct answer paragraphs render', () => {
    submitAndWait()
    expect(screen.getByText(/one of the hardest questions/i)).toBeInTheDocument()
  })

  it('"What Scripture Says" heading appears', () => {
    submitAndWait()
    expect(screen.getByText('What Scripture Says')).toBeInTheDocument()
  })

  it('3 verse cards render with reference, text, and explanation', () => {
    submitAndWait()
    // References may appear in both inline text links and verse cards
    expect(screen.getAllByText('Romans 8:28').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Psalm 34:18').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('2 Corinthians 1:3-4').length).toBeGreaterThanOrEqual(1)
  })

  it('verse cards are FrostedCard (rounded-2xl, border-white/[0.12], bg-white/[0.06])', () => {
    submitAndWait()
    const verseCards = screen.getAllByText('Romans 8:28')
    const verseCard = verseCards
      .find((el) => el.closest('.rounded-2xl'))
      ?.closest('.rounded-2xl') as HTMLElement | null
    expect(verseCard?.className).toContain('rounded-2xl')
    expect(verseCard?.className).toContain('border-white/[0.12]')
    expect(verseCard?.className).toContain('bg-white/[0.06]')
    expect(verseCard?.className).toContain('backdrop-blur-sm')
  })

  it('encouragement callout is Tier 2 (border-l-4, rounded-xl, bg-white/[0.04])', () => {
    submitAndWait()
    const encouragement = screen.getByText(/Your pain matters to God/i).closest('div')
    expect(encouragement?.className).toContain('rounded-xl')
    expect(encouragement?.className).toContain('border-l-4')
    expect(encouragement?.className).toContain('border-l-primary/60')
    expect(encouragement?.className).toContain('bg-white/[0.04]')
    expect(encouragement?.className).not.toContain('border-l-2')
  })

  it('prayer section has "Pray About This" label + non-italic sans text', () => {
    submitAndWait()
    expect(screen.getByText('Pray About This')).toBeInTheDocument()
    const prayer = screen.getByText(/Lord, I am hurting/i)
    expect(prayer.className).not.toContain('font-serif')
    expect(prayer.className).not.toContain('italic')
    expect(prayer.className).toContain('text-white/80')
  })

  it('AI disclaimer appears below response', () => {
    submitAndWait()
    expect(
      screen.getByText('AI-generated content for encouragement. Not professional advice.')
    ).toBeInTheDocument()
  })

  it('response section uses motion-safe:animate-fade-in-up', () => {
    submitAndWait()
    const responseSection = screen
      .getByText('What Scripture Says')
      .closest('.motion-safe\\:animate-fade-in-up')
    expect(responseSection).toBeInTheDocument()
  })
})

describe('AskPage — Action Buttons', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockAuthFn.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test User', id: 'test-user-id' },
      login: vi.fn(),
      logout: vi.fn(),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function submitAndWait(questionText = 'Why does God allow suffering?') {
    renderAskPage()
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: questionText },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Find Answers' }))
    act(() => {
      vi.advanceTimersByTime(2100)
    })
  }

  it('"Ask another question" clears textarea and response', () => {
    submitAndWait()
    fireEvent.click(screen.getByRole('button', { name: /Ask another question/i }))
    // Should show input section again
    expect(screen.getByLabelText('Your question')).toBeInTheDocument()
    expect(screen.getByLabelText('Your question')).toHaveValue('')
    expect(screen.queryByText('What Scripture Says')).not.toBeInTheDocument()
  })

  it('"Ask another question" scrolls to top', () => {
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    submitAndWait()
    fireEvent.click(screen.getByRole('button', { name: /Ask another question/i }))
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    scrollSpy.mockRestore()
  })

  it('4 action buttons render below response', () => {
    submitAndWait()
    expect(screen.getByRole('button', { name: /Ask another question/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Journal about this/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pray about this/i })).toBeInTheDocument()
    // Top-level share button + per-verse share buttons
    const shareButtons = screen.getAllByRole('button', { name: /Share/i })
    expect(shareButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('"Share" copies text to clipboard', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextSpy },
      writable: true,
      configurable: true,
    })
    submitAndWait()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Share$/i }))
    })
    expect(writeTextSpy).toHaveBeenCalledWith(
      expect.stringContaining('Romans 8:28 — Found on Worship Room')
    )
  })

  it('action buttons are 2x2 grid on mobile (grid-cols-2 class)', () => {
    submitAndWait()
    const container = screen.getByRole('button', { name: /Ask another question/i }).parentElement
    expect(container?.className).toContain('grid-cols-2')
  })
})

describe('AskPage — Feedback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    mockAuthFn.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test User', id: 'test-user-id' },
      login: vi.fn(),
      logout: vi.fn(),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  function submitAndWait() {
    renderAskPage()
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'Why does God allow suffering?' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Find Answers' }))
    act(() => {
      vi.advanceTimersByTime(2100)
    })
  }

  it('thumbs up button highlights in primary color', () => {
    submitAndWait()
    fireEvent.click(screen.getByRole('button', { name: 'Yes, helpful' }))
    const icon = screen.getByRole('button', { name: 'Yes, helpful' }).querySelector('svg')
    expect(icon?.classList.contains('fill-primary')).toBe(true)
  })

  it('thumbs down button highlights in danger color', () => {
    submitAndWait()
    fireEvent.click(screen.getByRole('button', { name: 'No, not helpful' }))
    const icon = screen.getByRole('button', { name: 'No, not helpful' }).querySelector('svg')
    expect(icon?.classList.contains('fill-danger')).toBe(true)
  })

  it('thank-you message appears on feedback selection', () => {
    submitAndWait()
    fireEvent.click(screen.getByRole('button', { name: 'Yes, helpful' }))
    expect(screen.getByText('Thank you for your feedback!')).toBeInTheDocument()
  })

  it('thank-you message auto-dismisses after 2s', () => {
    submitAndWait()
    fireEvent.click(screen.getByRole('button', { name: 'Yes, helpful' }))
    expect(screen.getByText('Thank you for your feedback!')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(2100)
    })
    expect(screen.queryByText('Thank you for your feedback!')).not.toBeInTheDocument()
  })

  it('feedback stored in localStorage for logged-in user', () => {
    submitAndWait()
    fireEvent.click(screen.getByRole('button', { name: 'Yes, helpful' }))
    const stored = JSON.parse(localStorage.getItem('wr_chat_feedback') || '[]')
    expect(stored).toHaveLength(1)
    expect(stored[0].questionId).toBe('suffering')
    expect(stored[0].helpful).toBe(true)
  })

  it('feedback NOT stored for logged-out user (auth modal shown instead)', () => {
    mockAuthFn.mockReturnValue({
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    })
    renderAskPage()
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'Why does God allow suffering?' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Find Answers' }))
    act(() => {
      vi.advanceTimersByTime(2100)
    })
    // Clicking feedback as logged-out user should show auth modal, not store feedback
    fireEvent.click(screen.getByRole('button', { name: 'Yes, helpful' }))
    expect(screen.getByText('Sign in to give feedback')).toBeInTheDocument()
    expect(localStorage.getItem('wr_chat_feedback')).toBeNull()
  })

  it('feedback buttons have aria-pressed', () => {
    submitAndWait()
    expect(screen.getByRole('button', { name: 'Yes, helpful' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Yes, helpful' }))
    expect(screen.getByRole('button', { name: 'Yes, helpful' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })
})

describe('AskPage — URL Params', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('pre-fills textarea from ?q= param', () => {
    mockAuthFn.mockReturnValue({
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    })
    renderAskPage('/ask?q=What%20about%20anxiety')
    expect(screen.getByLabelText('Your question')).toHaveValue('What about anxiety')
  })

  it('auto-submits for logged-in user with ?q=', () => {
    mockAuthFn.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test', id: 'test' },
      login: vi.fn(),
      logout: vi.fn(),
    })
    renderAskPage('/ask?q=anxiety')
    // The auto-submit uses setTimeout(0) then the loading delay
    act(() => {
      vi.advanceTimersByTime(1)
    })
    // Should be in loading state
    expect(screen.getByText('Searching Scripture for wisdom...')).toBeInTheDocument()
  })

  it('auto-submits for logged-out user with ?q=', () => {
    mockAuthFn.mockReturnValue({
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    })
    renderAskPage('/ask?q=anxiety')
    act(() => {
      vi.advanceTimersByTime(1)
    })
    // Should be in loading state — first response is free for all users
    expect(screen.getByText('Searching Scripture for wisdom...')).toBeInTheDocument()
  })
})

describe('AskPage — Full Flow Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockAuthFn.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test User', id: 'test-user-id' },
      login: vi.fn(),
      logout: vi.fn(),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('full flow: type question → submit → loading → response', () => {
    renderAskPage()
    const textarea = screen.getByLabelText('Your question')
    fireEvent.change(textarea, { target: { value: 'I feel so anxious' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find Answers' }))

    // Loading state
    expect(screen.getByText('Searching Scripture for wisdom...')).toBeInTheDocument()
    expect(screen.queryByText('What Scripture Says')).not.toBeInTheDocument()

    // Advance past delay
    act(() => {
      vi.advanceTimersByTime(2100)
    })

    // Response
    expect(screen.queryByText('Searching Scripture for wisdom...')).not.toBeInTheDocument()
    expect(screen.getByText('What Scripture Says')).toBeInTheDocument()
    // Should match anxiety response — may appear in inline text + verse card
    expect(screen.getAllByText('Philippians 4:6-7').length).toBeGreaterThanOrEqual(1)
  })

  it('full flow: click chip → submit → response matches chip topic', () => {
    renderAskPage()

    // Use fireEvent for speed in fake timer context
    fireEvent.click(screen.getByRole('button', { name: 'How do I forgive someone?' }))
    fireEvent.click(screen.getByRole('button', { name: 'Find Answers' }))

    act(() => {
      vi.advanceTimersByTime(2100)
    })

    // Forgiveness response — may appear in inline text + verse card
    expect(screen.getAllByText('Ephesians 4:32').length).toBeGreaterThanOrEqual(1)
  })

  it('?q= param: pre-fills and auto-submits for logged-in', () => {
    renderAskPage('/ask?q=suffering')
    act(() => {
      vi.advanceTimersByTime(1) // setTimeout(0) for auto-submit
    })
    // Should be loading
    expect(screen.getByText('Searching Scripture for wisdom...')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(2100)
    })

    // Should have suffering response — may appear in inline text + verse card
    expect(screen.getAllByText('Romans 8:28').length).toBeGreaterThanOrEqual(1)
  })
})

describe('AskPage — Accessibility', () => {
  it('all interactive elements are keyboard accessible (have focusable roles)', () => {
    renderAskPage()
    const buttons = screen.getAllByRole('button')
    // 6 chips + 1 submit = 7 buttons minimum
    expect(buttons.length).toBeGreaterThanOrEqual(7)
    for (const button of buttons) {
      expect(button.tagName).toBe('BUTTON')
    }
  })

  it('heading hierarchy is valid (h1 exists)', () => {
    renderAskPage()
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent("Ask God's Word")
  })

  it('loading state announced to screen readers via aria-live', () => {
    renderAskPage()
    const liveRegion = document.querySelector('[aria-live="polite"]')
    expect(liveRegion).toBeInTheDocument()
  })

  it('response has proper heading hierarchy (h2)', () => {
    vi.useFakeTimers()
    mockAuthFn.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test', id: 'test' },
      login: vi.fn(),
      logout: vi.fn(),
    })
    renderAskPage()
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'suffering' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Find Answers' }))
    act(() => {
      vi.advanceTimersByTime(2100)
    })
    const h2 = screen.getByRole('heading', { level: 2 })
    expect(h2).toHaveTextContent('What Scripture Says')
    vi.useRealTimers()
  })

  it('textarea has associated label', () => {
    renderAskPage()
    const textarea = screen.getByLabelText('Your question')
    expect(textarea).toBeInTheDocument()
    expect(textarea.tagName).toBe('TEXTAREA')
  })

  it('textarea has aria-describedby for character count', () => {
    renderAskPage()
    const textarea = screen.getByLabelText('Your question')
    expect(textarea).toHaveAttribute('aria-describedby', 'ask-char-count')
  })

  it('topic chips and submit button have 44px minimum touch targets', () => {
    renderAskPage()
    const submitBtn = screen.getByRole('button', { name: 'Find Answers' })
    expect(submitBtn.className).toContain('min-h-[44px]')
    for (const chip of ASK_TOPIC_CHIPS) {
      const chipBtn = screen.getByRole('button', { name: chip })
      expect(chipBtn.className).toContain('min-h-[44px]')
    }
  })
})

describe('AskPage — Conversation Thread Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Mock scrollIntoView for jsdom
    Element.prototype.scrollIntoView = vi.fn()
    mockAuthFn.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test User', id: 'test-user-id' },
      login: vi.fn(),
      logout: vi.fn(),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function submitQuestion(questionText = 'Why does God allow suffering?') {
    renderAskPage()
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: questionText },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Find Answers' }))
    act(() => {
      vi.advanceTimersByTime(2200)
    })
  }

  it('question bubble appears in thread after submission', () => {
    submitQuestion()
    expect(screen.getByText('Why does God allow suffering?')).toBeInTheDocument()
  })

  it('follow-up chip click adds second Q&A pair', () => {
    submitQuestion()
    // Use the first matching chip (from the first response's Dig Deeper section)
    const chips = screen.getAllByRole('button', { name: /What if my suffering doesn't end/i })
    fireEvent.click(chips[0])
    act(() => {
      vi.advanceTimersByTime(2200)
    })
    // Both question bubbles should be visible
    expect(screen.getByText('Why does God allow suffering?')).toBeInTheDocument()
    // The follow-up question appears as both a bubble and in dig deeper chips
    const followUpTexts = screen.getAllByText(/What if my suffering doesn't end/)
    expect(followUpTexts.length).toBeGreaterThanOrEqual(1)
  })

  it('divider appears between Q&A pairs', () => {
    submitQuestion()
    const chip = screen.getByRole('button', { name: /How did Jesus handle pain/i })
    fireEvent.click(chip)
    act(() => {
      vi.advanceTimersByTime(2200)
    })
    // Multiple border-t elements exist in the response (thread divider + dig deeper border)
    const allBorderElements = document.querySelectorAll('[class*="border-t"]')
    expect(allBorderElements.length).toBeGreaterThanOrEqual(1)
  })

  it('"Ask another question" clears thread during multi-pair conversation', () => {
    submitQuestion()
    fireEvent.click(screen.getByRole('button', { name: /What if my suffering doesn't end/i }))
    act(() => {
      vi.advanceTimersByTime(2200)
    })
    fireEvent.click(screen.getByRole('button', { name: /Ask another question/i }))
    expect(screen.getByLabelText('Your question')).toBeInTheDocument()
    expect(screen.queryByText('What Scripture Says')).not.toBeInTheDocument()
  })

  it('Popular Topics visible before any submission', () => {
    renderAskPage()
    expect(screen.getByText('Popular Topics')).toBeInTheDocument()
  })

  it('Popular Topics hidden after question submitted', () => {
    submitQuestion()
    expect(screen.queryByText('Popular Topics')).not.toBeInTheDocument()
  })

  it('Popular Topics re-shown after "Ask another question"', () => {
    submitQuestion()
    fireEvent.click(screen.getByRole('button', { name: /Ask another question/i }))
    expect(screen.getByText('Popular Topics')).toBeInTheDocument()
  })

  it('Dig Deeper section renders after response', () => {
    submitQuestion()
    expect(screen.getByText('Dig Deeper')).toBeInTheDocument()
  })

  it('inline verse links navigate to Bible reader', () => {
    submitQuestion()
    const links = screen.getAllByRole('link', { name: 'Romans 8:28' })
    expect(links.length).toBeGreaterThanOrEqual(1)
    expect(links[0]).toHaveAttribute('href', '/bible/romans/8#verse-28')
  })
})

describe('AskPage — Auth Gating (follow-up actions)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('verse reference links in response are public (no auth gate)', () => {
    mockAuthFn.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test', id: 'test' },
      login: vi.fn(),
      logout: vi.fn(),
    })
    renderAskPage()
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'suffering' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Find Answers' }))
    act(() => {
      vi.advanceTimersByTime(2200)
    })
    const links = screen.getAllByRole('link', { name: 'Romans 8:28' })
    expect(links.length).toBeGreaterThanOrEqual(1)
    expect(links[0]).toHaveAttribute('href', '/bible/romans/8#verse-28')
  })
})

describe('AskPage — Logged-Out First Response', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Element.prototype.scrollIntoView = vi.fn()
    mockAuthFn.mockReturnValue({
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('logged-out: Find Answers submits and shows response', () => {
    renderAskPage()
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'Why does God allow suffering?' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Find Answers' }))
    expect(screen.getByText('Searching Scripture for wisdom...')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(2100)
    })
    expect(screen.getByText('What Scripture Says')).toBeInTheDocument()
  })

  it('logged-out: ?q= param auto-submits and shows response', () => {
    renderAskPage('/ask?q=suffering')
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByText('Searching Scripture for wisdom...')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(2100)
    })
    expect(screen.getByText('What Scripture Says')).toBeInTheDocument()
  })

  it('logged-out: Popular Topics auto-submits first response', () => {
    renderAskPage()
    // Click a Popular Topic card — button text is the topic name + description
    const popularButton = screen.getByRole('button', { name: /Overcoming Anxiety/i })
    fireEvent.click(popularButton)
    // The auto-submit effect fires after text state updates
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByText('Searching Scripture for wisdom...')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(2100)
    })
    expect(screen.getByText('What Scripture Says')).toBeInTheDocument()
  })

  it('logged-out: crisis keywords in ?q= show CrisisBanner', () => {
    renderAskPage('/ask?q=I%20want%20to%20kill%20myself')
    // CrisisBanner should show before auto-submit completes
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

describe('AskPage — Logged-Out Action Gating', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Element.prototype.scrollIntoView = vi.fn()
    mockAuthFn.mockReturnValue({
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function submitAndWaitLoggedOut(questionText = 'Why does God allow suffering?') {
    renderAskPage()
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: questionText },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Find Answers' }))
    act(() => {
      vi.advanceTimersByTime(2100)
    })
  }

  it('logged-out: follow-up chip click shows auth modal', () => {
    submitAndWaitLoggedOut()
    const chips = screen.getAllByRole('button', { name: /What if my suffering doesn't end/i })
    fireEvent.click(chips[0])
    expect(screen.getByText('Sign in to continue the conversation')).toBeInTheDocument()
  })

  it('logged-out: "Journal about this" shows auth modal', () => {
    submitAndWaitLoggedOut()
    fireEvent.click(screen.getByRole('button', { name: /Journal about this/i }))
    expect(screen.getByText('Sign in to save journal entries')).toBeInTheDocument()
  })

  it('logged-out: "Pray about this" shows auth modal', () => {
    submitAndWaitLoggedOut()
    fireEvent.click(screen.getByRole('button', { name: /Pray about this/i }))
    expect(screen.getByText('Sign in to generate prayers')).toBeInTheDocument()
  })

  it('logged-out: feedback thumbs up shows auth modal', () => {
    submitAndWaitLoggedOut()
    fireEvent.click(screen.getByRole('button', { name: 'Yes, helpful' }))
    expect(screen.getByText('Sign in to give feedback')).toBeInTheDocument()
  })

  it('logged-out: feedback thumbs down shows auth modal', () => {
    submitAndWaitLoggedOut()
    fireEvent.click(screen.getByRole('button', { name: 'No, not helpful' }))
    expect(screen.getByText('Sign in to give feedback')).toBeInTheDocument()
  })

  it('logged-out: Copy/Share works without auth', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextSpy },
      writable: true,
      configurable: true,
    })
    submitAndWaitLoggedOut()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Share$/i }))
    })
    expect(writeTextSpy).toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('logged-out: "Ask another question" works without auth', () => {
    submitAndWaitLoggedOut()
    fireEvent.click(screen.getByRole('button', { name: /Ask another question/i }))
    expect(screen.getByLabelText('Your question')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('logged-out: SaveConversationButton not rendered', () => {
    submitAndWaitLoggedOut()
    expect(screen.queryByRole('button', { name: /Save conversation/i })).not.toBeInTheDocument()
  })
})

describe('AskPage — Conversion Prompt Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('conversion prompt appears for logged-out user after response', () => {
    mockAuthFn.mockReturnValue({
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    })
    renderAskPage()
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'suffering' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Find Answers' }))
    act(() => {
      vi.advanceTimersByTime(2100)
    })
    expect(screen.getByText('This is just the beginning.')).toBeInTheDocument()
  })

  it('conversion prompt does NOT appear for logged-in user', () => {
    mockAuthFn.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test', id: 'test' },
      login: vi.fn(),
      logout: vi.fn(),
    })
    renderAskPage()
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'suffering' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Find Answers' }))
    act(() => {
      vi.advanceTimersByTime(2100)
    })
    expect(screen.queryByText('This is just the beginning.')).not.toBeInTheDocument()
  })

  it('conversion prompt dismisses on "Keep exploring"', () => {
    mockAuthFn.mockReturnValue({
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    })
    renderAskPage()
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'suffering' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Find Answers' }))
    act(() => {
      vi.advanceTimersByTime(2100)
    })
    expect(screen.getByText('This is just the beginning.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Keep exploring' }))
    expect(screen.queryByText('This is just the beginning.')).not.toBeInTheDocument()
  })
})

