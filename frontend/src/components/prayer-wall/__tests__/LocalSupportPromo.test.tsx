import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LocalSupportPromo } from '../LocalSupportPromo'

function renderPromo() {
  return render(
    <MemoryRouter>
      <LocalSupportPromo />
    </MemoryRouter>,
  )
}

describe('LocalSupportPromo', () => {
  it('renders heading, body copy, and CTA', () => {
    renderPromo()
    expect(screen.getByText(/need someone to talk to/i)).toBeInTheDocument()
    expect(
      screen.getByText(
        /find a local church, counselor, or celebrate recovery group/i,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /browse local support/i }),
    ).toBeInTheDocument()
  })

  it('CTA links to /local-support/churches', () => {
    renderPromo()
    const link = screen.getByRole('link', { name: /browse local support/i })
    expect(link.getAttribute('href')).toBe('/local-support/churches')
  })

  it('section is labelled by the heading', () => {
    const { container } = renderPromo()
    const section = container.querySelector('section')
    expect(section).toHaveAttribute('aria-labelledby', 'lsp-heading')
    expect(container.querySelector('#lsp-heading')).toBeInTheDocument()
  })
})
