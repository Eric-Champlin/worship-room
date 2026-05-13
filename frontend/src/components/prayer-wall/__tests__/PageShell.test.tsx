import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { PageShell } from '../PageShell'
import { AuthProvider } from '@/contexts/AuthContext'

// Mock useNightMode so we can control active state independently of localStorage / hour.
vi.mock('@/hooks/useNightMode', () => ({
  useNightMode: vi.fn(),
}))

import { useNightMode } from '@/hooks/useNightMode'

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  )
}

describe('PageShell — Spec 6.3 night-aware wrap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders data-night-mode='off' when useNightMode returns active=false", () => {
    vi.mocked(useNightMode).mockReturnValue({
      active: false,
      source: 'auto',
      userPreference: 'auto',
    })
    const { container } = render(
      <Wrapper>
        <PageShell>
          <div>child</div>
        </PageShell>
      </Wrapper>,
    )
    const outer = container.firstElementChild as HTMLElement
    expect(outer.getAttribute('data-night-mode')).toBe('off')
  })

  it("renders data-night-mode='on' when useNightMode returns active=true", () => {
    vi.mocked(useNightMode).mockReturnValue({
      active: true,
      source: 'auto',
      userPreference: 'auto',
    })
    const { container } = render(
      <Wrapper>
        <PageShell>
          <div>child</div>
        </PageShell>
      </Wrapper>,
    )
    const outer = container.firstElementChild as HTMLElement
    expect(outer.getAttribute('data-night-mode')).toBe('on')
  })

  it('children render inside the night-aware wrap', () => {
    vi.mocked(useNightMode).mockReturnValue({
      active: true,
      source: 'auto',
      userPreference: 'auto',
    })
    const { getByText } = render(
      <Wrapper>
        <PageShell>
          <div>page-content</div>
        </PageShell>
      </Wrapper>,
    )
    expect(getByText('page-content')).toBeInTheDocument()
  })
})
