import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CrisisResourcesBanner } from '../CrisisResourcesBanner'

describe('CrisisResourcesBanner (Spec 6.4)', () => {
  it('renders with role="region" and aria-labelledby pointing to heading', () => {
    render(<CrisisResourcesBanner />)
    const region = screen.getByRole('region', { name: /you're not alone/i })
    expect(region).toBeInTheDocument()
  })

  it('contains tel:988 link with correct aria-label', () => {
    render(<CrisisResourcesBanner />)
    const phoneLink = screen.getByRole('link', {
      name: /call 988 suicide and crisis lifeline/i,
    })
    expect(phoneLink).toHaveAttribute('href', 'tel:988')
  })

  it('contains 988 chat link with target=_blank, rel=noopener noreferrer, and aria-label', () => {
    render(<CrisisResourcesBanner />)
    const chatLink = screen.getByRole('link', {
      name: /open 988 lifeline chat in new tab/i,
    })
    expect(chatLink).toHaveAttribute('href', 'https://988lifeline.org/chat/')
    expect(chatLink).toHaveAttribute('target', '_blank')
    expect(chatLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('has NO close button rendered (Gate-G-CRISIS-RESOURCES-ALWAYS-VISIBLE)', () => {
    render(<CrisisResourcesBanner />)
    expect(
      screen.queryByRole('button', { name: /close|dismiss|hide/i }),
    ).not.toBeInTheDocument()
  })

  it('988 phone link is the first focusable interactive element (W34)', () => {
    render(<CrisisResourcesBanner />)
    const links = screen.getAllByRole('link')
    expect(links[0]).toHaveAttribute('href', 'tel:988')
  })
})
