import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { SignOutEverywhereDialog } from '../SignOutEverywhereDialog'
import { SESSIONS_COPY } from '@/constants/sessions-copy'

describe('SignOutEverywhereDialog — Spec 1.5g', () => {
  it('renders nothing when isOpen=false', () => {
    const { container } = render(
      <SignOutEverywhereDialog isOpen={false} onClose={() => {}} onConfirm={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders title, body, and both buttons when open', () => {
    render(<SignOutEverywhereDialog isOpen onClose={() => {}} onConfirm={() => {}} />)
    expect(screen.getByText(SESSIONS_COPY.confirmEverywhereTitle)).toBeInTheDocument()
    expect(screen.getByText(SESSIONS_COPY.confirmEverywhereBody)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: SESSIONS_COPY.confirmEverywhereCancel }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: SESSIONS_COPY.confirmEverywhereAction }),
    ).toBeInTheDocument()
  })

  it('uses role="alertdialog" for the modal', () => {
    render(<SignOutEverywhereDialog isOpen onClose={() => {}} onConfirm={() => {}} />)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(
      <SignOutEverywhereDialog isOpen onClose={onClose} onConfirm={() => {}} />,
    )
    fireEvent.click(screen.getByRole('button', { name: SESSIONS_COPY.confirmEverywhereCancel }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onConfirm when the destructive button is clicked', () => {
    const onConfirm = vi.fn()
    render(
      <SignOutEverywhereDialog isOpen onClose={() => {}} onConfirm={onConfirm} />,
    )
    fireEvent.click(screen.getByRole('button', { name: SESSIONS_COPY.confirmEverywhereAction }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <SignOutEverywhereDialog isOpen onClose={onClose} onConfirm={() => {}} />,
    )
    // Backdrop is the first absolute-inset div with aria-hidden
    const backdrop = container.querySelector('[aria-hidden="true"]')
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
