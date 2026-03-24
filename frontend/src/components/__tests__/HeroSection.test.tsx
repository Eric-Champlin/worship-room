import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { HeroSection } from '@/components/HeroSection'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))

function renderHero() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthModalProvider>
          <HeroSection />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

describe('HeroSection', () => {
  it('renders the correct heading text', () => {
    renderHero()
    expect(
      screen.getByRole('heading', { name: /how're you feeling today/i })
    ).toBeInTheDocument()
  })

  it('renders the subtitle text', () => {
    renderHero()
    expect(
      screen.getByText(/AI-powered guidance built on Biblical principles/i)
    ).toBeInTheDocument()
  })

  it('has an accessible input', () => {
    renderHero()
    expect(
      screen.getByRole('textbox', {
        name: /tell us how you're feeling/i,
      })
    ).toBeInTheDocument()
  })

  it('has a keyboard-accessible submit button inside a form', () => {
    renderHero()
    const button = screen.getByRole('button', {
      name: /submit your question/i,
    })
    expect(button).toBeInTheDocument()
    expect(button.closest('form')).toBeInTheDocument()
  })

  it('has a named section landmark', () => {
    renderHero()
    expect(
      screen.getByRole('region', { name: /welcome to worship room/i })
    ).toBeInTheDocument()
  })

  it('shows auth modal when logged-out user submits', async () => {
    const user = userEvent.setup()
    renderHero()

    const input = screen.getByRole('textbox')
    await user.click(input)
    await user.type(input, 'I need prayer')
    await user.click(
      screen.getByRole('button', { name: /submit your question/i })
    )

    expect(
      screen.getByRole('dialog', { name: /log in/i })
    ).toBeInTheDocument()
    expect(
      screen.getByText('Sign in to ask questions')
    ).toBeInTheDocument()
  })

  it('does not navigate when logged-out user submits', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastProvider>
          <AuthModalProvider>
            <Routes>
              <Route path="/" element={<HeroSection />} />
              <Route
                path="/pray"
                element={<div data-testid="pray-page" />}
              />
            </Routes>
          </AuthModalProvider>
        </ToastProvider>
      </MemoryRouter>
    )

    const input = screen.getByRole('textbox')
    await user.click(input)
    await user.type(input, 'I need prayer')
    await user.click(
      screen.getByRole('button', { name: /submit your question/i })
    )

    expect(screen.queryByTestId('pray-page')).not.toBeInTheDocument()
  })

  it('renders the quiz teaser text', () => {
    renderHero()
    expect(screen.getByText(/not sure where to start/i)).toBeInTheDocument()
  })

  it('renders the quiz teaser link', () => {
    renderHero()
    expect(
      screen.getByRole('button', { name: /take a 30-second quiz/i })
    ).toBeInTheDocument()
  })

  it('scrolls to #quiz on teaser link click', async () => {
    const user = userEvent.setup()
    renderHero()

    const scrollIntoViewMock = vi.fn()
    const mockElement = { scrollIntoView: scrollIntoViewMock }
    vi.spyOn(document, 'getElementById').mockReturnValue(mockElement as unknown as HTMLElement)

    await user.click(screen.getByRole('button', { name: /take a 30-second quiz/i }))

    expect(document.getElementById).toHaveBeenCalledWith('quiz')
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' })

    vi.restoreAllMocks()
  })
})
