import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { BibleBrowse } from '../BibleBrowse'

function renderWithProviders(ui: React.ReactElement) {
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

describe('BibleBrowse', () => {
  it('renders BibleBooksMode content', () => {
    renderWithProviders(<BibleBrowse />)
    // BibleBooksMode renders the OT/NT book lists — check for a known book
    expect(screen.getByText('Genesis')).toBeInTheDocument()
  })
})
