import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const acceptLegalVersionsApiMock = vi.fn(async () => {})
vi.mock('@/services/api/legal-api', () => ({
  acceptLegalVersionsApi: (terms: string, privacy: string) =>
    acceptLegalVersionsApiMock(terms, privacy),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}))

// useFocusTrap actually invokes onEscape on Escape — keep the real hook so
// the test exercises the production keyboard handler. (The hook listens via
// the container ref's keydown event; userEvent dispatches at document level
// which DOES bubble through the container.)
import { TermsUpdateModal } from '../TermsUpdateModal'

const VERSIONS = {
  termsVersion: '2026-04-29',
  privacyVersion: '2026-04-29',
  communityGuidelinesVersion: '2026-04-29',
}

const matchMediaSpy = vi.spyOn(window, 'matchMedia')

function setMobileViewport(isMobile: boolean) {
  matchMediaSpy.mockImplementation((query: string) => ({
    matches: isMobile && query.includes('max-width: 768px'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

describe('TermsUpdateModal', () => {
  beforeEach(() => {
    acceptLegalVersionsApiMock.mockReset()
    acceptLegalVersionsApiMock.mockResolvedValue(undefined)
    matchMediaSpy.mockReset()
    setMobileViewport(false)
  })

  afterEach(() => {
    matchMediaSpy.mockReset()
  })

  it('Escape key fires onDismiss', async () => {
    const onDismiss = vi.fn()
    const onAccepted = vi.fn()
    const user = userEvent.setup()

    render(
      <TermsUpdateModal
        isOpen
        versions={VERSIONS}
        onDismiss={onDismiss}
        onAccepted={onAccepted}
      />,
    )

    // Move focus inside the dialog so the focus-trap container's keydown
    // handler receives the Escape event.
    const reviewButton = screen.getByRole('button', { name: /review and accept/i })
    reviewButton.focus()

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })
    expect(onAccepted).not.toHaveBeenCalled()
  })

  it('mobile backdrop tap does NOT dismiss the modal', async () => {
    setMobileViewport(true)
    const onDismiss = vi.fn()
    const user = userEvent.setup()

    const { container } = render(
      <TermsUpdateModal
        isOpen
        versions={VERSIONS}
        onDismiss={onDismiss}
        onAccepted={vi.fn()}
      />,
    )

    // The outermost div is the backdrop; click it directly.
    const backdrop = container.firstElementChild as HTMLElement
    expect(backdrop).toBeTruthy()

    await user.click(backdrop)

    expect(onDismiss).not.toHaveBeenCalled()
    // The dialog should still be on-screen.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('desktop backdrop click DOES dismiss the modal', async () => {
    setMobileViewport(false)
    const onDismiss = vi.fn()
    const user = userEvent.setup()

    const { container } = render(
      <TermsUpdateModal
        isOpen
        versions={VERSIONS}
        onDismiss={onDismiss}
        onAccepted={vi.fn()}
      />,
    )

    const backdrop = container.firstElementChild as HTMLElement
    await user.click(backdrop)

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('checkbox state resets between modal opens', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <TermsUpdateModal
        isOpen
        versions={VERSIONS}
        onDismiss={vi.fn()}
        onAccepted={vi.fn()}
      />,
    )

    // Walk to accept-form view and check the box.
    await user.click(screen.getByRole('button', { name: /review and accept/i }))
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)
    expect(checkbox).toBeChecked()

    // Close the modal.
    rerender(
      <TermsUpdateModal
        isOpen={false}
        versions={VERSIONS}
        onDismiss={vi.fn()}
        onAccepted={vi.fn()}
      />,
    )

    // Reopen — should be back at the notice view, no checkbox visible.
    rerender(
      <TermsUpdateModal
        isOpen
        versions={VERSIONS}
        onDismiss={vi.fn()}
        onAccepted={vi.fn()}
      />,
    )
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /review and accept/i }),
    ).toBeInTheDocument()
  })
})
