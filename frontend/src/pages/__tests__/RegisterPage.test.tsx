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
  const actual = await vi.importActual<typeof import('@/components/prayer-wall/AuthModalProvider')>(
    '@/components/prayer-wall/AuthModalProvider'
  )
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
    </MemoryRouter>
  )
}

describe('RegisterPage', () => {
  beforeEach(() => {
    mockOpenAuthModal.mockClear()
  })

  // --- Hero ---

  it('renders hero heading "Your room is ready."', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { level: 1, name: /your room is ready/i })
    ).toBeInTheDocument()
  })

  it('renders hero subtitle with Round 2 copy', () => {
    renderPage()
    expect(screen.getByText(/eighty-two features/i)).toBeInTheDocument()
    expect(screen.getByText(/no ads\. no credit card to sign up/i)).toBeInTheDocument()
    // "No credit card" appears in both the hero subtitle and the final CTA reassurance
    expect(screen.getAllByText(/no credit card/i).length).toBeGreaterThanOrEqual(1)
  })

  // --- Hook section ---

  it('renders "Why we built this" eyebrow', () => {
    renderPage()
    expect(screen.getByText(/why we built this/i)).toBeInTheDocument()
  })

  it('renders hook heading', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { level: 2, name: /faith tools that meet you/i })
    ).toBeInTheDocument()
  })

  // --- StatsBar (8 stats) ---

  it('renders all 8 StatsBar labels', () => {
    renderPage()
    // StatsBar labels. "Ambient Sounds" also appears in pillar REST bullet, so use aria-label match
    expect(screen.getByLabelText('66 Bible Books')).toBeInTheDocument()
    expect(screen.getByLabelText('50 Devotionals')).toBeInTheDocument()
    expect(screen.getByLabelText('10 Reading Plans')).toBeInTheDocument()
    expect(screen.getByLabelText('24 Ambient Sounds')).toBeInTheDocument()
    expect(screen.getByLabelText('6 Meditation Types')).toBeInTheDocument()
    expect(screen.getByLabelText('5 Seasonal Challenges')).toBeInTheDocument()
    expect(screen.getByLabelText('8 Worship Playlists')).toBeInTheDocument()
    expect(screen.getByLabelText('12 Bedtime Stories')).toBeInTheDocument()
  })

  // --- Pillars ---

  it('renders pillar section heading', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { level: 2, name: /everything included when you sign up/i })
    ).toBeInTheDocument()
  })

  it('renders exactly 6 pillar cards', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 3, name: 'PRAY' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'READ' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'GROW' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'REST' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'BELONG' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'DISCOVER' })).toBeInTheDocument()
  })

  it('pillars subtitle references six pillars, not five', () => {
    renderPage()
    expect(screen.getByText(/six pillars/i)).toBeInTheDocument()
    expect(screen.queryByText(/five pillars/i)).not.toBeInTheDocument()
  })

  it('DISCOVER pillar has 5 features', () => {
    renderPage()
    expect(screen.getByText(/midnight verse reveal when you're up past 11 pm/i)).toBeInTheDocument()
    expect(screen.getByText(/verse echoes: we bring back what you highlighted/i)).toBeInTheDocument()
    expect(screen.getByText(/song of the day: 30 rotating worship tracks/i)).toBeInTheDocument()
    expect(screen.getByText(/seasonal banners for advent, lent, easter/i)).toBeInTheDocument()
    expect(screen.getByText(/anniversary celebrations on your 30-day, 100-day/i)).toBeInTheDocument()
  })

  it('renders pillar taglines', () => {
    renderPage()
    expect(screen.getByText(/personal prayer, guided sessions/i)).toBeInTheDocument()
    expect(screen.getByText(/the full bible, never gated/i)).toBeInTheDocument()
    expect(screen.getByText(/habits that honor presence/i)).toBeInTheDocument()
    expect(screen.getByText(/sleep better\. meditate on scripture/i)).toBeInTheDocument()
    expect(screen.getByText(/community without noise/i)).toBeInTheDocument()
  })

  // --- DashboardPreview ---

  it('renders DashboardPreview', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { level: 2, name: /see how you're growing/i })
    ).toBeInTheDocument()
  })

  // --- Spotlight ---

  it('renders spotlight section heading', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { level: 2, name: /small details you won't find/i })
    ).toBeInTheDocument()
  })

  it('renders all 3 spotlight cards', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 3, name: 'Verse Echoes' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Grace-Based Streaks' })
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Midnight Verse' })).toBeInTheDocument()
  })

  // --- Differentiator ---

  it('renders differentiator heading', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { level: 2, name: /worship room is different/i })
    ).toBeInTheDocument()
  })

  it('renders all 8 differentiator items with Round 2 copy', () => {
    renderPage()
    expect(
      screen.getByText(/no ads, ever\. your worship time is not monetizable/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/no data harvesting/i)).toBeInTheDocument()
    expect(screen.getByText(/grace-based streaks that celebrate presence/i)).toBeInTheDocument()
    // "The entire Bible is free to read" also appears in the hook paragraph; expect 2
    expect(screen.getAllByText(/the entire bible is free to read/i).length).toBeGreaterThanOrEqual(
      2
    )
    expect(
      screen.getByText(/your prayers, journals, and bookmarks are yours/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/crisis keyword detection/i)).toBeInTheDocument()
    expect(screen.getByText(/works offline as an installable app/i)).toBeInTheDocument()
    expect(screen.getByText(/real accessibility/i)).toBeInTheDocument()
  })

  it('does NOT contain "free forever" text', () => {
    renderPage()
    expect(screen.queryByText(/free forever/i)).not.toBeInTheDocument()
  })

  it('does NOT contain "premium tier" text', () => {
    renderPage()
    expect(screen.queryByText(/premium tier/i)).not.toBeInTheDocument()
  })

  it('does NOT contain "no trial" text', () => {
    renderPage()
    expect(screen.queryByText(/no trial/i)).not.toBeInTheDocument()
  })

  it('final reassurance reads "No credit card. No commitment. Just peace."', () => {
    renderPage()
    expect(screen.getByText(/no credit card\. no commitment\. just peace/i)).toBeInTheDocument()
  })

  it('hero H1 has animate-gradient-shift class', () => {
    renderPage()
    const h1 = screen.getByRole('heading', { level: 1, name: /your room is ready/i })
    expect(h1.className).toContain('animate-gradient-shift')
  })

  it('both primary CTAs have animate-shine class', () => {
    renderPage()
    const ctaButtons = screen
      .getAllByRole('button', { name: /create your account/i })
      .filter((btn) => btn.textContent?.trim() === 'Create Your Account')
    expect(ctaButtons).toHaveLength(2)
    ctaButtons.forEach((btn) => expect(btn.className).toContain('animate-shine'))
  })

  // --- Callout ---

  it('renders content depth callout', () => {
    renderPage()
    expect(screen.getByText(/built by one person/i)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: /six months of nights and weekends/i })
    ).toBeInTheDocument()
  })

  // --- Final CTA ---

  it('renders final CTA heading', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { level: 2, name: /ready to step inside/i })
    ).toBeInTheDocument()
  })

  // --- Auth modal interactions ---

  it('hero CTA opens auth modal in register mode', async () => {
    renderPage()
    const user = userEvent.setup()
    const ctaButtons = screen
      .getAllByRole('button', { name: /create your account/i })
      .filter((btn) => btn.textContent?.trim() === 'Create Your Account')
    expect(ctaButtons).toHaveLength(2)
    await user.click(ctaButtons[0])
    expect(mockOpenAuthModal).toHaveBeenCalledWith(undefined, 'register')
  })

  it('final CTA opens auth modal in register mode', async () => {
    renderPage()
    const user = userEvent.setup()
    const ctaButtons = screen
      .getAllByRole('button', { name: /create your account/i })
      .filter((btn) => btn.textContent?.trim() === 'Create Your Account')
    expect(ctaButtons).toHaveLength(2)
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

  it('heading hierarchy: single h1, multiple h2s', () => {
    renderPage()
    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    const h2s = screen.getAllByRole('heading', { level: 2 })
    expect(h2s.length).toBeGreaterThanOrEqual(7)
  })

  it('renders navbar', () => {
    renderPage()
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
  })

  it('renders footer', () => {
    renderPage()
    expect(screen.getAllByRole('contentinfo').length).toBeGreaterThanOrEqual(1)
  })

  it('"Create Your Account" CTA appears exactly twice', () => {
    renderPage()
    const ctaButtons = screen
      .getAllByRole('button', { name: /create your account/i })
      .filter((btn) => btn.textContent?.trim() === 'Create Your Account')
    expect(ctaButtons).toHaveLength(2)
  })

  // --- Color compliance ---

  it('check icons inside main do not use text-primary', () => {
    renderPage()
    const main = screen.getByRole('main')
    const checks = main.querySelectorAll('svg.lucide-check')
    expect(checks.length).toBeGreaterThan(0)
    checks.forEach((check) => {
      const className =
        (check as SVGElement).className.baseVal ?? (check as unknown as HTMLElement).className
      expect(className).not.toContain('text-primary')
      expect(className).toContain('text-white')
    })
  })
})
