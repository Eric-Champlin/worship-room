import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { QuickActions } from '../QuickActions'

function renderQuickActions() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <QuickActions />
    </MemoryRouter>,
  )
}

describe('QuickActions', () => {
  it('renders 4 buttons', () => {
    renderQuickActions()
    expect(screen.getByText('Pray')).toBeInTheDocument()
    expect(screen.getByText('Journal')).toBeInTheDocument()
    expect(screen.getByText('Meditate')).toBeInTheDocument()
    expect(screen.getByText('Music')).toBeInTheDocument()
  })

  it('Pray links to /daily?tab=pray', () => {
    renderQuickActions()
    const link = screen.getByText('Pray').closest('a')
    expect(link).toHaveAttribute('href', '/daily?tab=pray')
  })

  it('Journal links to /daily?tab=journal', () => {
    renderQuickActions()
    const link = screen.getByText('Journal').closest('a')
    expect(link).toHaveAttribute('href', '/daily?tab=journal')
  })

  it('Meditate links to /daily?tab=meditate', () => {
    renderQuickActions()
    const link = screen.getByText('Meditate').closest('a')
    expect(link).toHaveAttribute('href', '/daily?tab=meditate')
  })

  it('Music links to /music', () => {
    renderQuickActions()
    const link = screen.getByText('Music').closest('a')
    expect(link).toHaveAttribute('href', '/music')
  })

  it('buttons have accessible labels', () => {
    renderQuickActions()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(4)
    links.forEach((link) => {
      expect(link).toHaveAccessibleName()
    })
  })
})
