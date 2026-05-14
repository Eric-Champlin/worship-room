import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { ShareTestimonyWarningModal } from '../ShareTestimonyWarningModal'
import {
  SHARE_WARNING_BODY,
  SHARE_WARNING_CANCEL,
  SHARE_WARNING_CONFIRM,
  SHARE_WARNING_TITLE,
} from '@/constants/testimony-share-copy'

describe('ShareTestimonyWarningModal', () => {
  it('renders nothing when open=false', () => {
    render(
      <ShareTestimonyWarningModal
        open={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(
      screen.queryByTestId('share-testimony-warning-modal'),
    ).not.toBeInTheDocument()
  })

  it('renders dialog with title, body, confirm + cancel when open=true', () => {
    render(
      <ShareTestimonyWarningModal
        open={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'share-testimony-warning-title')
    expect(screen.getByText(SHARE_WARNING_TITLE)).toBeInTheDocument()
    expect(screen.getByText(SHARE_WARNING_BODY)).toBeInTheDocument()
    expect(screen.getByText(SHARE_WARNING_CONFIRM)).toBeInTheDocument()
    expect(screen.getByText(SHARE_WARNING_CANCEL)).toBeInTheDocument()
  })

  it('Esc key invokes onCancel via the focus trap', () => {
    const onCancel = vi.fn()
    render(
      <ShareTestimonyWarningModal
        open={true}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )
    // useFocusTrap binds keydown on the container; the trap focuses the first
    // focusable on mount, so the Escape keydown fires on the focused element
    // (which is inside the container).
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('backdrop click invokes onCancel', () => {
    const onCancel = vi.fn()
    render(
      <ShareTestimonyWarningModal
        open={true}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )
    fireEvent.click(screen.getByTestId('share-testimony-warning-modal'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('dialog content click does NOT invoke onCancel (stopPropagation)', () => {
    const onCancel = vi.fn()
    render(
      <ShareTestimonyWarningModal
        open={true}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )
    // Click directly on the title element inside the dialog content; backdrop
    // listener should not see this event.
    fireEvent.click(screen.getByText(SHARE_WARNING_TITLE))
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('confirm button invokes onConfirm', () => {
    const onConfirm = vi.fn()
    render(
      <ShareTestimonyWarningModal
        open={true}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByTestId('share-warning-confirm'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('cancel button invokes onCancel', () => {
    const onCancel = vi.fn()
    render(
      <ShareTestimonyWarningModal
        open={true}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )
    fireEvent.click(screen.getByTestId('share-warning-cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
