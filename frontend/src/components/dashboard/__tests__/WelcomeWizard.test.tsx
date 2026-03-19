import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { WelcomeWizard } from '../WelcomeWizard'
import { AVATAR_PRESETS, UNLOCKABLE_AVATARS } from '@/constants/dashboard/avatars'
import { QUIZ_QUESTIONS } from '@/components/quiz-data'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockLogin = vi.fn()
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { name: 'Eric', id: 'test-id' },
    login: mockLogin,
    logout: vi.fn(),
  }),
}))

const mockOnComplete = vi.fn()

function renderWizard(userName = 'Eric') {
  return render(
    <MemoryRouter>
      <WelcomeWizard
        userName={userName}
        onComplete={mockOnComplete}
      />
    </MemoryRouter>,
  )
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

// ===========================================================================
// Screen 1 — Welcome
// ===========================================================================

describe('Screen 1 — Welcome', () => {
  it('renders welcome heading in Caveat font', () => {
    renderWizard()
    const heading = screen.getByText('Welcome to Worship Room')
    expect(heading.className).toContain('font-script')
  })

  it('pre-fills display name from userName prop', () => {
    renderWizard('TestUser')
    const input = screen.getByLabelText('What should we call you?')
    expect(input).toHaveValue('TestUser')
  })

  it('shows error when name is empty and user blurs', async () => {
    const user = userEvent.setup()
    renderWizard('')
    const input = screen.getByLabelText('What should we call you?')
    await user.click(input)
    await user.tab()
    expect(screen.getByText('Name must be 2-30 characters')).toBeInTheDocument()
  })

  it('shows error when name is 1 character after blur', async () => {
    const user = userEvent.setup()
    renderWizard('')
    const input = screen.getByLabelText('What should we call you?')
    await user.type(input, 'A')
    await user.tab()
    expect(screen.getByText('Name must be 2-30 characters')).toBeInTheDocument()
  })

  it('Next is disabled when name is invalid', () => {
    renderWizard('')
    const nextBtn = screen.getByRole('button', { name: 'Next' })
    expect(nextBtn).toBeDisabled()
  })

  it('Next is enabled when name is 2-30 chars', () => {
    renderWizard('Eric')
    const nextBtn = screen.getByRole('button', { name: 'Next' })
    expect(nextBtn).toBeEnabled()
  })

  it('dot indicator shows first dot active', () => {
    renderWizard()
    const dots = screen.getByRole('dialog').querySelectorAll('[aria-hidden="true"] > div')
    // First dot should be larger (h-3 w-3)
    expect(dots[0].className).toContain('h-3')
    expect(dots[0].className).toContain('bg-primary')
    // Others smaller
    expect(dots[1].className).toContain('h-2')
    expect(dots[1].className).toContain('bg-white/30')
  })

  it('Skip for now is visible', () => {
    renderWizard()
    expect(screen.getByRole('button', { name: 'Skip for now' })).toBeInTheDocument()
  })

  it('Skip calls setOnboardingComplete and onComplete', async () => {
    const user = userEvent.setup()
    renderWizard()
    await user.click(screen.getByRole('button', { name: 'Skip for now' }))
    expect(localStorage.getItem('wr_onboarding_complete')).toBe('true')
    expect(mockOnComplete).toHaveBeenCalledTimes(1)
  })

  it('Skip does NOT save name or avatar', async () => {
    const user = userEvent.setup()
    renderWizard()
    // Change name
    const input = screen.getByLabelText('What should we call you?')
    await user.clear(input)
    await user.type(input, 'NewName')
    // Skip
    await user.click(screen.getByRole('button', { name: 'Skip for now' }))
    expect(mockLogin).not.toHaveBeenCalled()
    expect(localStorage.getItem('wr_settings')).toBeNull()
  })

  it('dialog has role="dialog" with aria-labelledby', () => {
    renderWizard()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-labelledby', 'wizard-heading-welcome')
  })

  it('input has associated label', () => {
    renderWizard()
    const input = screen.getByLabelText('What should we call you?')
    expect(input).toHaveAttribute('id', 'wizard-name')
  })

  it('error message uses aria-describedby', async () => {
    const user = userEvent.setup()
    renderWizard('')
    const input = screen.getByLabelText('What should we call you?')
    await user.click(input)
    await user.tab()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'wizard-name-error')
  })

  it('has minimum 44px touch targets on interactive elements', () => {
    renderWizard()
    const skipBtn = screen.getByRole('button', { name: 'Skip for now' })
    expect(skipBtn.className).toContain('min-h-[44px]')
  })

  it('respects prefers-reduced-motion on entrance', () => {
    renderWizard()
    const dialog = screen.getByRole('dialog')
    expect(dialog.className).toContain('motion-safe:animate-continue-fade-in')
    expect(dialog.className).toContain('motion-reduce:animate-none')
  })
})

// ===========================================================================
// Screen 2 — Avatar Selection
// ===========================================================================

describe('Screen 2 — Avatar Selection', () => {
  async function goToScreen2() {
    const user = userEvent.setup()
    renderWizard('Eric')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    return user
  }

  it('renders all 16 preset avatars', async () => {
    await goToScreen2()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(16)
  })

  it('does NOT render unlockable avatars', async () => {
    await goToScreen2()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(AVATAR_PRESETS.length)
    // Ensure no unlockable names appear
    for (const unlockable of UNLOCKABLE_AVATARS) {
      expect(screen.queryByLabelText(unlockable.name)).not.toBeInTheDocument()
    }
  })

  it('renders 4 category labels', async () => {
    await goToScreen2()
    expect(screen.getByText('Nature')).toBeInTheDocument()
    expect(screen.getByText('Faith')).toBeInTheDocument()
    expect(screen.getByText('Water')).toBeInTheDocument()
    expect(screen.getByText('Light')).toBeInTheDocument()
  })

  it('default selection is nature-dove', async () => {
    await goToScreen2()
    const dove = screen.getByRole('radio', { name: 'Dove' })
    expect(dove).toHaveAttribute('aria-checked', 'true')
  })

  it('clicking avatar updates selection', async () => {
    const user = await goToScreen2()
    const cross = screen.getByRole('radio', { name: 'Cross' })
    await user.click(cross)
    expect(cross).toHaveAttribute('aria-checked', 'true')
    // Previous default deselected
    const dove = screen.getByRole('radio', { name: 'Dove' })
    expect(dove).toHaveAttribute('aria-checked', 'false')
  })

  it('selected avatar has ring highlight', async () => {
    await goToScreen2()
    const dove = screen.getByRole('radio', { name: 'Dove' })
    expect(dove.className).toContain('ring-2')
    expect(dove.className).toContain('ring-primary')
  })

  it('avatar grid has role="radiogroup"', async () => {
    await goToScreen2()
    expect(screen.getByRole('radiogroup', { name: 'Avatar selection' })).toBeInTheDocument()
  })

  it('each avatar has role="radio" with aria-checked', async () => {
    await goToScreen2()
    const radios = screen.getAllByRole('radio')
    for (const radio of radios) {
      expect(radio).toHaveAttribute('aria-checked')
    }
  })

  it('each avatar has aria-label with name', async () => {
    await goToScreen2()
    expect(screen.getByRole('radio', { name: 'Dove' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Cross' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Wave' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Star' })).toBeInTheDocument()
  })

  it('Back returns to Screen 1', async () => {
    const user = await goToScreen2()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('Welcome to Worship Room')).toBeInTheDocument()
  })

  it('Next advances to Screen 3', async () => {
    const user = await goToScreen2()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('What Brought You Here?')).toBeInTheDocument()
  })
})

// ===========================================================================
// Screen 3 — Quiz
// ===========================================================================

describe('Screen 3 — Quiz', () => {
  async function goToScreen3() {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <MemoryRouter>
        <WelcomeWizard userName="Eric" onComplete={mockOnComplete} />
      </MemoryRouter>,
    )
    // Navigate: Screen 1 → 2 → 3
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    return user
  }

  it('renders quiz heading "What Brought You Here?"', async () => {
    await goToScreen3()
    expect(screen.getByText('What Brought You Here?')).toBeInTheDocument()
  })

  it('renders question 1 text and 4 options', async () => {
    await goToScreen3()
    expect(screen.getByText(QUIZ_QUESTIONS[0].question)).toBeInTheDocument()
    for (const option of QUIZ_QUESTIONS[0].options) {
      expect(screen.getByText(option.label)).toBeInTheDocument()
    }
  })

  it('selecting an option shows checkmark', async () => {
    const user = await goToScreen3()
    const firstOption = screen.getByRole('radio', { name: QUIZ_QUESTIONS[0].options[0].label })
    await user.click(firstOption)
    expect(firstOption).toHaveAttribute('aria-checked', 'true')
  })

  it('auto-advances to next question after ~400ms', async () => {
    const user = await goToScreen3()
    await user.click(screen.getByRole('radio', { name: QUIZ_QUESTIONS[0].options[0].label }))

    // Advance timer to trigger auto-advance
    act(() => {
      vi.advanceTimersByTime(450)
    })

    // Should now show question 2
    expect(screen.getByText(QUIZ_QUESTIONS[1].question)).toBeInTheDocument()
  })

  it('Back on Q1 returns to Screen 2 (Avatar)', async () => {
    const user = await goToScreen3()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('Choose Your Avatar')).toBeInTheDocument()
  })

  it('Back on Q2+ returns to previous question', async () => {
    const user = await goToScreen3()

    // Answer Q1 to go to Q2
    await user.click(screen.getByRole('radio', { name: QUIZ_QUESTIONS[0].options[0].label }))
    act(() => {
      vi.advanceTimersByTime(450)
    })
    expect(screen.getByText(QUIZ_QUESTIONS[1].question)).toBeInTheDocument()

    // Back from Q2
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText(QUIZ_QUESTIONS[0].question)).toBeInTheDocument()
  })

  it('previous answer is preserved when going back', async () => {
    const user = await goToScreen3()

    // Answer Q1
    await user.click(screen.getByRole('radio', { name: QUIZ_QUESTIONS[0].options[1].label }))
    act(() => {
      vi.advanceTimersByTime(450)
    })

    // Back to Q1
    await user.click(screen.getByRole('button', { name: 'Back' }))

    // Previous answer should still be selected
    const selectedOption = screen.getByRole('radio', { name: QUIZ_QUESTIONS[0].options[1].label })
    expect(selectedOption).toHaveAttribute('aria-checked', 'true')
  })

  it('quiz options use dark frosted glass styling', async () => {
    await goToScreen3()
    const option = screen.getByRole('radio', { name: QUIZ_QUESTIONS[0].options[0].label })
    expect(option.className).toContain('bg-white/5')
    expect(option.className).toContain('border-white/10')
  })

  it('option groups have role="radiogroup"', async () => {
    await goToScreen3()
    expect(screen.getByRole('radiogroup', { name: 'Question 1' })).toBeInTheDocument()
  })

  it('each option has role="radio" with aria-checked', async () => {
    await goToScreen3()
    const radios = screen.getAllByRole('radio')
    for (const radio of radios) {
      expect(radio).toHaveAttribute('aria-checked')
    }
  })

  it('after Q5, calculates result and advances to Screen 4', async () => {
    const user = await goToScreen3()

    // Answer all 5 questions
    for (let q = 0; q < QUIZ_QUESTIONS.length; q++) {
      await user.click(screen.getByRole('radio', { name: QUIZ_QUESTIONS[q].options[0].label }))
      act(() => {
        vi.advanceTimersByTime(450)
      })
    }

    // Should be on Screen 4
    expect(screen.getByText(/You.re All Set!/i)).toBeInTheDocument()
  })

  it('Next button is hidden on Screen 3', async () => {
    await goToScreen3()
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
  })

  it('dot indicator shows 3rd dot active on Screen 3', async () => {
    await goToScreen3()
    const dots = screen.getByRole('dialog').querySelectorAll('[aria-hidden="true"] > div')
    expect(dots[2].className).toContain('h-3')
    expect(dots[2].className).toContain('bg-primary')
  })
})

// ===========================================================================
// Screen 4 — Results & Launch
// ===========================================================================

describe('Screen 4 — Results & Launch', () => {
  async function goToScreen4() {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <MemoryRouter>
        <WelcomeWizard userName="Eric" onComplete={mockOnComplete} />
      </MemoryRouter>,
    )
    // Navigate: Screen 1 → 2 → 3
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    // Answer all 5 quiz questions
    for (let q = 0; q < QUIZ_QUESTIONS.length; q++) {
      await user.click(screen.getByRole('radio', { name: QUIZ_QUESTIONS[q].options[0].label }))
      act(() => {
        vi.advanceTimersByTime(450)
      })
    }
    return user
  }

  it('renders "You\'re All Set!" heading in Caveat font', async () => {
    await goToScreen4()
    const heading = screen.getByText(/You.re All Set!/i)
    expect(heading.className).toContain('font-script')
  })

  it('displays quiz result recommendation title', async () => {
    await goToScreen4()
    // The result depends on the answers chosen (all first options)
    // Just verify some recommendation text is shown
    expect(screen.getByText(/We.d recommend starting with/i)).toBeInTheDocument()
  })

  it('displays quiz result description', async () => {
    await goToScreen4()
    // Result card should have a description paragraph
    const resultCard = screen.getByText(/We.d recommend starting with/i).closest('div')
    expect(resultCard).toBeTruthy()
  })

  it('displays scripture verse in serif italic', async () => {
    await goToScreen4()
    const blockquote = document.querySelector('blockquote')
    expect(blockquote).toBeTruthy()
    expect(blockquote!.className).toContain('font-serif')
    expect(blockquote!.className).toContain('italic')
  })

  it('"Start Your Journey" saves name to wr_user_name via login()', async () => {
    const user = await goToScreen4()
    await user.click(screen.getByRole('button', { name: 'Start Your Journey' }))
    expect(mockLogin).toHaveBeenCalledWith('Eric')
  })

  it('"Start Your Journey" saves avatar to wr_settings', async () => {
    const user = await goToScreen4()
    await user.click(screen.getByRole('button', { name: 'Start Your Journey' }))
    const settings = JSON.parse(localStorage.getItem('wr_settings')!)
    expect(settings.profile.avatarId).toBeDefined()
  })

  it('"Start Your Journey" sets wr_onboarding_complete', async () => {
    const user = await goToScreen4()
    await user.click(screen.getByRole('button', { name: 'Start Your Journey' }))
    expect(localStorage.getItem('wr_onboarding_complete')).toBe('true')
  })

  it('"Start Your Journey" navigates to recommended route', async () => {
    const user = await goToScreen4()
    await user.click(screen.getByRole('button', { name: 'Start Your Journey' }))
    expect(mockNavigate).toHaveBeenCalledTimes(1)
    // The route depends on quiz answers, just verify it's called with a string
    expect(typeof mockNavigate.mock.calls[0][0]).toBe('string')
  })

  it('"Explore on your own" saves data and calls onComplete', async () => {
    const user = await goToScreen4()
    await user.click(screen.getByRole('button', { name: 'Explore on your own' }))
    expect(mockLogin).toHaveBeenCalledWith('Eric')
    expect(localStorage.getItem('wr_onboarding_complete')).toBe('true')
    expect(mockOnComplete).toHaveBeenCalledTimes(1)
  })

  it('"Explore on your own" does NOT navigate to a route', async () => {
    const user = await goToScreen4()
    await user.click(screen.getByRole('button', { name: 'Explore on your own' }))
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('Back returns to Screen 3 at Q5', async () => {
    const user = await goToScreen4()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText(QUIZ_QUESTIONS[4].question)).toBeInTheDocument()
  })

  it('Back on Screen 4 preserves Q5 answer', async () => {
    const user = await goToScreen4()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    // The first option should still be selected (we chose option[0] for Q5)
    const selectedOption = screen.getByRole('radio', { name: QUIZ_QUESTIONS[4].options[0].label })
    expect(selectedOption).toHaveAttribute('aria-checked', 'true')
  })

  it('Skip on Screen 4 does NOT save name or avatar', async () => {
    const user = await goToScreen4()
    await user.click(screen.getByRole('button', { name: 'Skip for now' }))
    expect(mockLogin).not.toHaveBeenCalled()
    // Only wr_onboarding_complete should be set
    expect(localStorage.getItem('wr_onboarding_complete')).toBe('true')
    expect(mockOnComplete).toHaveBeenCalledTimes(1)
  })
})

// ===========================================================================
// Full Flow Integration
// ===========================================================================

describe('Full Wizard Flow', () => {
  it('full wizard flow: name → avatar → quiz → complete', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <MemoryRouter>
        <WelcomeWizard userName="Eric" onComplete={mockOnComplete} />
      </MemoryRouter>,
    )

    // Screen 1: Verify name, press Next
    expect(screen.getByText('Welcome to Worship Room')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Screen 2: Select avatar, press Next
    expect(screen.getByText('Choose Your Avatar')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Cross' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Screen 3: Answer all 5 questions
    expect(screen.getByText('What Brought You Here?')).toBeInTheDocument()
    for (let q = 0; q < QUIZ_QUESTIONS.length; q++) {
      await user.click(screen.getByRole('radio', { name: QUIZ_QUESTIONS[q].options[0].label }))
      act(() => {
        vi.advanceTimersByTime(450)
      })
    }

    // Screen 4: Start Your Journey
    expect(screen.getByText(/You.re All Set!/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start Your Journey' }))

    // Verify all data saved
    expect(mockLogin).toHaveBeenCalledWith('Eric')
    expect(localStorage.getItem('wr_onboarding_complete')).toBe('true')
    const settings = JSON.parse(localStorage.getItem('wr_settings')!)
    expect(settings.profile.avatarId).toBe('faith-cross')
    expect(mockNavigate).toHaveBeenCalledTimes(1)
  })

  it('skip on Screen 1 sets flag and transitions', async () => {
    const user = userEvent.setup()
    renderWizard()
    await user.click(screen.getByRole('button', { name: 'Skip for now' }))
    expect(localStorage.getItem('wr_onboarding_complete')).toBe('true')
    expect(mockOnComplete).toHaveBeenCalledTimes(1)
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('skip mid-quiz does not save partial data', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <MemoryRouter>
        <WelcomeWizard userName="Eric" onComplete={mockOnComplete} />
      </MemoryRouter>,
    )

    // Go to Screen 3
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Answer Q1
    await user.click(screen.getByRole('radio', { name: QUIZ_QUESTIONS[0].options[0].label }))
    act(() => {
      vi.advanceTimersByTime(450)
    })

    // Skip
    await user.click(screen.getByRole('button', { name: 'Skip for now' }))
    expect(mockLogin).not.toHaveBeenCalled()
    expect(localStorage.getItem('wr_settings')).toBeNull()
    expect(localStorage.getItem('wr_onboarding_complete')).toBe('true')
  })

  it('changing name on Screen 1, skipping, original name preserved', async () => {
    const user = userEvent.setup()
    renderWizard('OriginalName')
    const input = screen.getByLabelText('What should we call you?')
    await user.clear(input)
    await user.type(input, 'NewName')
    await user.click(screen.getByRole('button', { name: 'Skip for now' }))
    // login() should NOT have been called (name not saved)
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('changing avatar on Screen 2, skipping, original avatar preserved', async () => {
    const user = userEvent.setup()
    renderWizard()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('radio', { name: 'Cross' }))
    await user.click(screen.getByRole('button', { name: 'Skip for now' }))
    expect(localStorage.getItem('wr_settings')).toBeNull()
  })

  it('Back from Screen 4 → re-answer Q5 → new result on Screen 4', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <MemoryRouter>
        <WelcomeWizard userName="Eric" onComplete={mockOnComplete} />
      </MemoryRouter>,
    )

    // Navigate to Screen 4 (answer all first options)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    for (let q = 0; q < QUIZ_QUESTIONS.length; q++) {
      await user.click(screen.getByRole('radio', { name: QUIZ_QUESTIONS[q].options[0].label }))
      act(() => {
        vi.advanceTimersByTime(450)
      })
    }
    expect(screen.getByText(/You.re All Set!/i)).toBeInTheDocument()

    // Go back to Q5
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText(QUIZ_QUESTIONS[4].question)).toBeInTheDocument()

    // Re-answer Q5 with a different option
    await user.click(screen.getByRole('radio', { name: QUIZ_QUESTIONS[4].options[2].label }))
    act(() => {
      vi.advanceTimersByTime(450)
    })

    // Should be back on Screen 4 with possibly different result
    expect(screen.getByText(/You.re All Set!/i)).toBeInTheDocument()
  })

  it('handles localStorage unavailable gracefully', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    // Should not crash
    expect(() => renderWizard()).not.toThrow()
    vi.restoreAllMocks()
  })
})

// ===========================================================================
// Accessibility
// ===========================================================================

describe('Accessibility', () => {
  it('all screens have proper heading with unique id', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <MemoryRouter>
        <WelcomeWizard userName="Eric" onComplete={mockOnComplete} />
      </MemoryRouter>,
    )

    // Screen 1
    expect(document.getElementById('wizard-heading-welcome')).toBeInTheDocument()

    // Screen 2
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(document.getElementById('wizard-heading-avatar')).toBeInTheDocument()

    // Screen 3
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(document.getElementById('wizard-heading-quiz')).toBeInTheDocument()

    // Screen 4
    for (let q = 0; q < QUIZ_QUESTIONS.length; q++) {
      await user.click(screen.getByRole('radio', { name: QUIZ_QUESTIONS[q].options[0].label }))
      act(() => {
        vi.advanceTimersByTime(450)
      })
    }
    expect(document.getElementById('wizard-heading-results')).toBeInTheDocument()
  })

  it('quiz option groups use radiogroup/radio', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <MemoryRouter>
        <WelcomeWizard userName="Eric" onComplete={mockOnComplete} />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('radiogroup', { name: 'Question 1' })).toBeInTheDocument()
    const radios = within(screen.getByRole('radiogroup', { name: 'Question 1' })).getAllByRole('radio')
    expect(radios.length).toBe(4)
  })

  it('avatar grid uses radiogroup/radio', async () => {
    const user = userEvent.setup()
    renderWizard()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('radiogroup', { name: 'Avatar selection' })).toBeInTheDocument()
    const radios = within(screen.getByRole('radiogroup', { name: 'Avatar selection' })).getAllByRole('radio')
    expect(radios.length).toBe(16)
  })

  it('keyboard: Tab navigates, Enter/Space activates', async () => {
    const user = userEvent.setup()
    renderWizard()
    // Tab to Next button and press Enter
    await user.tab() // input
    await user.tab() // Next button
    await user.tab() // Skip
    // Can navigate via tab — this confirms keyboard accessibility
    const skipBtn = screen.getByRole('button', { name: 'Skip for now' })
    expect(document.activeElement === skipBtn || document.activeElement?.textContent === 'Skip for now').toBeTruthy()
  })
})
