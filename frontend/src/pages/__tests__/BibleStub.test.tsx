import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { BibleStub } from '../BibleStub'

function renderWithRouter(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <AuthModalProvider>{ui}</AuthModalProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('BibleStub', () => {
  it('renders stub message for "my"', () => {
    renderWithRouter(<BibleStub page="my" />)
    expect(screen.getByText('My Bible — coming in BB-14')).toBeInTheDocument()
  })

  it('renders stub message for "plans"', () => {
    renderWithRouter(<BibleStub page="plans" />)
    expect(screen.getByText('Plans browser — coming in BB-21.5')).toBeInTheDocument()
  })

  it('renders stub message for "search"', () => {
    renderWithRouter(<BibleStub page="search" />)
    expect(screen.getByText('Search — coming in BB-42')).toBeInTheDocument()
  })
})
