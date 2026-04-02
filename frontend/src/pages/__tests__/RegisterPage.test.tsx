import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { RegisterPage } from '@/pages/RegisterPage'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))

const mockOpenAuthModal = vi.fn()
vi.mock('@/components/prayer-wall/AuthModalProvider', async () => {
  const actual = await vi.importActual<
    typeof import('@/components/prayer-wall/AuthModalProvider')
  >('@/components/prayer-wall/AuthModalProvider')
  return {
    ...actual,
    useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
  }
})

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={['/register']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <RegisterPage />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('RegisterPage', () => {
  beforeEach(() => {
    mockOpenAuthModal.mockClear()
  })

  // --- Content rendering ---

  it('renders hero heading', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { level: 1, name: /your sanctuary is ready/i }),
    ).toBeInTheDocument()
  })

  it('renders hero subtitle', () => {
    renderPage()
    expect(screen.getByText(/free, peaceful space/i)).toBeInTheDocument()
  })

  it('renders all 4 feature cards', () => {
    renderPage()
    expect(screen.getByText('Prayers written for your heart')).toBeInTheDocument()
    expect(screen.getByText('Watch your faith grow')).toBeInTheDocument()
    expect(screen.getByText("You're not alone")).toBeInTheDocument()
    expect(screen.getByText('Bible, Devotionals & More')).toBeInTheDocument()
  })

  it('renders stats heading', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: /numbers behind the room/i }),
    ).toBeInTheDocument()
  })

  it('renders all 6 stats', () => {
    renderPage()
    expect(screen.getByText('66 books')).toBeInTheDocument()
    expect(screen.getByText('50 devotionals')).toBeInTheDocument()
    expect(screen.getByText('24 ambient sounds')).toBeInTheDocument()
    expect(screen.getByText('10 reading plans')).toBeInTheDocument()
    expect(screen.getByText('5 seasonal challenges')).toBeInTheDocument()
    expect(screen.getByText('Completely free')).toBeInTheDocument()
  })

  it('renders differentiator heading', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: /why worship room is different/i }),
    ).toBeInTheDocument()
  })

  it('renders 4 differentiator items', () => {
    renderPage()
    expect(screen.getByText(/free forever/i)).toBeInTheDocument()
    expect(screen.getByText(/no ads/i)).toBeInTheDocument()
    expect(screen.getByText(/no data harvesting/i)).toBeInTheDocument()
    expect(screen.getByText(/grace-based streaks/i)).toBeInTheDocument()
  })

  it('renders final CTA heading', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: /ready to step inside/i }),
    ).toBeInTheDocument()
  })

  // --- Auth modal interactions ---

  it('hero CTA opens auth modal in register mode', async () => {
    renderPage()
    const user = userEvent.setup()
    const ctaButtons = screen.getAllByRole('button', { name: /create your free account/i })
    await user.click(ctaButtons[0])
    expect(mockOpenAuthModal).toHaveBeenCalledWith(undefined, 'register')
  })

  it('final CTA opens auth modal in register mode', async () => {
    renderPage()
    const user = userEvent.setup()
    const ctaButtons = screen.getAllByRole('button', { name: /create your free account/i })
    await user.click(ctaButtons[1])
    expect(mockOpenAuthModal).toHaveBeenCalledWith(undefined, 'register')
  })

  it('"Log in" link opens auth modal in login mode', async () => {
    renderPage()
    const user = userEvent.setup()
    const main = screen.getByRole('main')
    const logInButtons = screen.getAllByRole('button', { name: /log in/i })
    const mainLogIn = logInButtons.find((btn) => main.contains(btn))!
    await user.click(mainLogIn)
    expect(mockOpenAuthModal).toHaveBeenCalledWith(undefined, 'login')
  })

  // --- Heading hierarchy & a11y ---

  it('heading hierarchy: single h1, h2s for sections', () => {
    renderPage()
    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    const h2s = screen.getAllByRole('heading', { level: 2 })
    expect(h2s.length).toBeGreaterThanOrEqual(3)
  })

  it('renders navbar', () => {
    renderPage()
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
  })

  it('renders footer', () => {
    renderPage()
    expect(screen.getAllByRole('contentinfo').length).toBeGreaterThanOrEqual(1)
  })

  it('all CTA buttons have accessible names', () => {
    renderPage()
    const ctaButtons = screen.getAllByRole('button', { name: /create your free account/i })
    expect(ctaButtons).toHaveLength(2)
  })
})
