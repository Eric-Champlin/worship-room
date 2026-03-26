import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CrisisBanner } from '../CrisisBanner'

function renderBanner(text: string) {
  return render(
    <MemoryRouter>
      <CrisisBanner text={text} />
    </MemoryRouter>,
  )
}

describe('CrisisBanner', () => {
  it('does not render for normal text', () => {
    const { container } = renderBanner('I feel sad today')
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('renders crisis resources for self-harm keyword "suicide"', () => {
    renderBanner('I am thinking about suicide')
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getAllByText(/988/).length).toBeGreaterThan(0)
  })

  it('renders for "kill myself"', () => {
    renderBanner('I want to kill myself')
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders for "end my life"', () => {
    renderBanner('I want to end my life')
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('does not render for empty text', () => {
    const { container } = renderBanner('')
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('does not render for vague emotional phrases', () => {
    const { container } = renderBanner('nobody cares about me and I feel hopeless')
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('uses aria-live="assertive" for accessibility', () => {
    renderBanner('suicide')
    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-live', 'assertive')
  })

  it('renders counselor CTA link', () => {
    renderBanner('I want to kill myself')
    expect(screen.getByText(/Find a counselor near you/)).toBeInTheDocument()
  })

  it('counselor link navigates to /local-support/counselors', () => {
    renderBanner('I want to kill myself')
    const link = screen.getByRole('link', { name: /Find a counselor near you/ })
    expect(link).toHaveAttribute('href', '/local-support/counselors')
  })

  it('counselor link has correct styling', () => {
    renderBanner('I want to kill myself')
    const link = screen.getByRole('link', { name: /Find a counselor near you/ })
    expect(link.className).toContain('text-primary')
    expect(link.className).toContain('font-semibold')
    expect(link.className).toContain('underline')
  })

  it('counselor CTA has visual separator', () => {
    renderBanner('I want to kill myself')
    const link = screen.getByRole('link', { name: /Find a counselor near you/ })
    const separator = link.closest('div')
    expect(separator?.className).toContain('border-t')
  })

  it('existing hotline resources still render', () => {
    renderBanner('I want to kill myself')
    expect(screen.getByText(/988 Suicide & Crisis Lifeline/)).toBeInTheDocument()
    expect(screen.getByText(/Crisis Text Line/)).toBeInTheDocument()
    expect(screen.getByText(/SAMHSA/)).toBeInTheDocument()
  })
})
