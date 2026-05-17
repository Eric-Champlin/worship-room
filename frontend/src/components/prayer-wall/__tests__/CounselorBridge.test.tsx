import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CounselorBridge } from '../CounselorBridge'

function renderBridge() {
  return render(
    <MemoryRouter>
      <CounselorBridge />
    </MemoryRouter>,
  )
}

describe('CounselorBridge (Spec 7.5)', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('renders the counselor link pointing at /local-support/counselors', () => {
    renderBridge()
    const link = screen.getByRole('link', {
      name: /Find a counselor near you/i,
    })
    expect(link).toHaveAttribute('href', '/local-support/counselors')
  })

  it('returns null when shouldShowCounselorBridge is already false', () => {
    sessionStorage.setItem('wr_counselor_bridge_dismissed', 'true')
    const { container } = renderBridge()
    expect(container.firstChild).toBeNull()
  })

  it('clicking dismiss writes to sessionStorage and unmounts the bridge', () => {
    renderBridge()
    expect(screen.getByTestId('counselor-bridge')).toBeInTheDocument()
    const dismissBtn = screen.getByRole('button', {
      name: /Dismiss counselor suggestion/i,
    })
    fireEvent.click(dismissBtn)
    expect(screen.queryByTestId('counselor-bridge')).not.toBeInTheDocument()
    expect(sessionStorage.getItem('wr_counselor_bridge_dismissed')).toBe('true')
  })

  it('dismiss button has aria-label and link has descriptive text', () => {
    renderBridge()
    expect(
      screen.getByRole('button', { name: /Dismiss counselor suggestion/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Find a counselor near you/i }),
    ).toBeInTheDocument()
  })

  it('uses the Spec-10A canonical link color (text-violet-300), NOT text-primary', () => {
    renderBridge()
    const link = screen.getByRole('link', {
      name: /Find a counselor near you/i,
    })
    expect(link.className).toContain('text-violet-300')
    expect(link.className).not.toContain('text-primary')
  })
})
