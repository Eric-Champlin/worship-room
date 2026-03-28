import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DashboardSection } from '../DashboardSection'
import { ToastProvider } from '@/components/ui/Toast'
import { getDashboardLayout, saveDashboardLayout } from '@/services/dashboard-layout-storage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

beforeEach(() => {
  localStorage.clear()
  mockNavigate.mockClear()
})

function renderSection() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <DashboardSection />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('DashboardSection', () => {
  it('renders Dashboard heading', () => {
    renderSection()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('Dashboard Layout button navigates to /?customize=true', () => {
    renderSection()
    fireEvent.click(screen.getByText('Dashboard Layout'))
    expect(mockNavigate).toHaveBeenCalledWith('/?customize=true')
  })

  it('Reset Dashboard Layout clears wr_dashboard_layout', () => {
    saveDashboardLayout({ order: ['votd'], hidden: [], customized: true })
    expect(getDashboardLayout()).not.toBeNull()

    renderSection()
    fireEvent.click(screen.getByText('Reset Dashboard Layout'))

    expect(getDashboardLayout()).toBeNull()
  })

  it('Reset Dashboard Layout shows confirmation toast', () => {
    renderSection()
    fireEvent.click(screen.getByText('Reset Dashboard Layout'))
    expect(screen.getByText('Dashboard layout reset to default')).toBeInTheDocument()
  })

  it('follows existing card styling', () => {
    renderSection()
    const card = screen.getByText('Dashboard').closest('div')
    expect(card).toHaveClass('rounded-2xl', 'border', 'border-white/10', 'bg-white/5')
  })
})
