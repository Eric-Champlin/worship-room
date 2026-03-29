import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Layout } from '../Layout'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isAuthenticated: false })),
}))

function renderLayout(dark?: boolean) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Layout dark={dark}>
        <div>test content</div>
      </Layout>
    </MemoryRouter>,
  )
}

describe('Layout', () => {
  it('renders with bg-neutral-bg by default', () => {
    const { container } = renderLayout()
    const outer = container.firstChild as HTMLElement
    expect(outer.className).toContain('bg-neutral-bg')
    expect(outer.className).not.toContain('bg-dashboard-dark')
  })

  it('renders with bg-dashboard-dark when dark prop is true', () => {
    const { container } = renderLayout(true)
    const outer = container.firstChild as HTMLElement
    expect(outer.className).toContain('bg-dashboard-dark')
    expect(outer.className).not.toContain('bg-neutral-bg')
  })
})
