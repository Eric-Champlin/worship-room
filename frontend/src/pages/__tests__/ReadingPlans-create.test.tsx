import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { ReadingPlansContent } from '../ReadingPlans'
import { CUSTOM_PLANS_KEY } from '@/constants/reading-plans'

const mockOpenAuthModal = vi.fn()

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

function renderPage(initialRoute = '/reading-plans') {
  return render(
    <MemoryRouter
      initialEntries={[initialRoute]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <ToastProvider>
          <ReadingPlansContent />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('ReadingPlans — Create Your Own Plan', () => {
  it('Create card renders on browser page', () => {
    renderPage()
    expect(screen.getByText('Create Your Own Plan')).toBeInTheDocument()
    expect(screen.getByText(/personalized Scripture journey/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Plan' })).toBeInTheDocument()
  })

  it('Create Plan button triggers auth modal for logged-out user', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Create Plan' }))
    expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to create a personalized reading plan')
  })

  it('Create Plan opens flow for logged-in user', async () => {
    localStorage.setItem('wr_auth_simulated', 'true')
    localStorage.setItem('wr_user_name', 'Eric')
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Create Plan' }))
    expect(screen.getByText("What's on your heart?")).toBeInTheDocument()
  })

  it('Creation flow renders when ?create=true', () => {
    localStorage.setItem('wr_auth_simulated', 'true')
    localStorage.setItem('wr_user_name', 'Eric')
    renderPage('/reading-plans?create=true')
    expect(screen.getByText("What's on your heart?")).toBeInTheDocument()
    // Browser page content should not be visible
    expect(screen.queryByText('Create Your Own Plan')).not.toBeInTheDocument()
  })

  it('Created for you badge shows on custom plans', () => {
    localStorage.setItem('wr_auth_simulated', 'true')
    localStorage.setItem('wr_user_name', 'Eric')
    localStorage.setItem(CUSTOM_PLANS_KEY, JSON.stringify(['finding-peace-in-anxiety']))
    renderPage()
    expect(screen.getByText('Created for you')).toBeInTheDocument()
  })

  it('Badge not shown when wr_custom_plans is empty', () => {
    localStorage.setItem('wr_auth_simulated', 'true')
    localStorage.setItem('wr_user_name', 'Eric')
    renderPage()
    expect(screen.queryByText('Created for you')).not.toBeInTheDocument()
  })

  it('Badge not shown for logged-out users', () => {
    localStorage.setItem(CUSTOM_PLANS_KEY, JSON.stringify(['finding-peace-in-anxiety']))
    renderPage()
    expect(screen.queryByText('Created for you')).not.toBeInTheDocument()
  })

  it('existing 10 plan cards still render', () => {
    renderPage()
    expect(screen.getByText('Finding Peace in Anxiety')).toBeInTheDocument()
    expect(screen.getByText('Walking Through Grief')).toBeInTheDocument()
    expect(screen.getByText('The Gratitude Reset')).toBeInTheDocument()
  })
})
