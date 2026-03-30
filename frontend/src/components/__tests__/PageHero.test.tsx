import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageHero } from '../PageHero'

describe('PageHero', () => {
  it('renders title with padding for Caveat flourish fix', () => {
    render(<PageHero title="Test Title" />)
    const heading = screen.getByRole('heading', { name: 'Test Title' })
    expect(heading.className).toContain('px-1')
    expect(heading.className).toContain('sm:px-2')
  })
})
