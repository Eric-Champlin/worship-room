import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'

import { PrayerReceiptModal } from '../PrayerReceiptModal'
import type { AttributedIntercessor } from '@/types/prayer-receipt'

function renderModal(opts: {
  attributedIntercessors?: AttributedIntercessor[]
  anonymousCount?: number
  totalCount?: number
  onClose?: () => void
} = {}) {
  const onClose = opts.onClose ?? vi.fn()
  const attributedIntercessors = opts.attributedIntercessors ?? []
  const anonymousCount = opts.anonymousCount ?? 0
  const totalCount =
    opts.totalCount ?? attributedIntercessors.length + anonymousCount

  return {
    onClose,
    ...render(
      <PrayerReceiptModal
        attributedIntercessors={attributedIntercessors}
        anonymousCount={anonymousCount}
        totalCount={totalCount}
        onClose={onClose}
      />,
    ),
  }
}

describe('PrayerReceiptModal (Spec 6.1)', () => {
  it('renders with role=dialog + aria-modal=true + aria-labelledby pointing at title', () => {
    renderModal({
      attributedIntercessors: [
        { userId: 'f1', displayName: 'Friend One', avatarUrl: null },
      ],
      totalCount: 1,
    })
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    const titleId = dialog.getAttribute('aria-labelledby')
    expect(titleId).toBe('prayer-receipt-modal-title')
    expect(document.getElementById(titleId!)).toHaveTextContent('Your prayer circle today')
  })

  it('Escape key closes the modal', async () => {
    const onClose = vi.fn()
    renderModal({
      attributedIntercessors: [
        { userId: 'f1', displayName: 'Friend One', avatarUrl: null },
      ],
      onClose,
    })
    // The focus trap listens for Escape on the container — fire on the dialog
    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog.querySelector('[ref], div') as Element, { key: 'Escape' })
    // Direct: the modal container's inner div carries the focus trap
    const containerInner = dialog.querySelector('[aria-labelledby="prayer-receipt-modal-title"]')
    if (containerInner) {
      fireEvent.keyDown(containerInner, { key: 'Escape' })
    }
    // Fallback: keydown on document — useFocusTrap attaches to the container
    fireEvent.keyDown(dialog, { key: 'Escape' })
    // At least one of the above should have triggered onClose
    expect(onClose).toHaveBeenCalled()
  })

  it('close (X) button click triggers onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderModal({
      attributedIntercessors: [
        { userId: 'f1', displayName: 'Friend One', avatarUrl: null },
      ],
      onClose,
    })
    await user.click(screen.getByTestId('prayer-receipt-modal-close'))
    expect(onClose).toHaveBeenCalled()
  })

  it('backdrop click closes (clicking the outer overlay)', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderModal({
      attributedIntercessors: [
        { userId: 'f1', displayName: 'Friend One', avatarUrl: null },
      ],
      onClose,
    })
    const dialog = screen.getByRole('dialog')
    await user.click(dialog)
    expect(onClose).toHaveBeenCalled()
  })

  it('clicking inside the modal content does NOT close', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderModal({
      attributedIntercessors: [
        { userId: 'f1', displayName: 'Friend One', avatarUrl: null },
      ],
      onClose,
    })
    await user.click(screen.getByText('Friend One'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('renders friend names verbatim from displayName', () => {
    renderModal({
      attributedIntercessors: [
        { userId: 'f1', displayName: 'Sarah K.', avatarUrl: null },
        { userId: 'f2', displayName: 'David', avatarUrl: null },
      ],
      totalCount: 2,
    })
    expect(screen.getByText('Sarah K.')).toBeInTheDocument()
    expect(screen.getByText('David')).toBeInTheDocument()
  })

  it('renders "A friend" for each anonymous reactor (non-friend has no identity)', () => {
    renderModal({
      attributedIntercessors: [],
      anonymousCount: 3,
      totalCount: 3,
    })
    const anonRows = screen.queryAllByTestId('prayer-receipt-modal-anon-row')
    expect(anonRows).toHaveLength(3)
    for (const row of anonRows) {
      expect(row).toHaveTextContent('A friend')
    }
  })

  it('renders overflow row when total exceeds visible rows', () => {
    // 11 friends, MAX_VISIBLE_ROWS=10 → 1 friend overflows
    const friends: AttributedIntercessor[] = Array.from({ length: 11 }, (_, i) => ({
      userId: `f${i}`,
      displayName: `Friend ${i}`,
      avatarUrl: null,
    }))
    renderModal({ attributedIntercessors: friends, totalCount: 11 })
    expect(screen.getByTestId('prayer-receipt-modal-overflow')).toHaveTextContent(
      '…and 1 other',
    )
  })

  // --- W38 / master plan AC: arrow keys navigate the intercessor list ---

  it('intercessor list has role=listbox and items have role=option (W38)', () => {
    renderModal({
      attributedIntercessors: [
        { userId: 'f1', displayName: 'Friend One', avatarUrl: null },
        { userId: 'f2', displayName: 'Friend Two', avatarUrl: null },
      ],
      anonymousCount: 1,
      totalCount: 3,
    })
    const listbox = screen.getByRole('listbox', { name: /intercessors/i })
    expect(listbox).toBeInTheDocument()
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3) // 2 friends + 1 anon row
  })

  it('uses roving tabindex: exactly one option has tabIndex=0 initially', () => {
    renderModal({
      attributedIntercessors: [
        { userId: 'f1', displayName: 'Friend One', avatarUrl: null },
        { userId: 'f2', displayName: 'Friend Two', avatarUrl: null },
      ],
      totalCount: 2,
    })
    const options = screen.getAllByRole('option')
    const tabbable = options.filter((o) => o.getAttribute('tabindex') === '0')
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0]).toBe(options[0])
  })

  it('ArrowDown moves focus to next option and wraps at end (W38)', () => {
    renderModal({
      attributedIntercessors: [
        { userId: 'f1', displayName: 'Friend One', avatarUrl: null },
        { userId: 'f2', displayName: 'Friend Two', avatarUrl: null },
      ],
      totalCount: 2,
    })
    const listbox = screen.getByRole('listbox', { name: /intercessors/i })
    const options = screen.getAllByRole('option')

    fireEvent.keyDown(listbox, { key: 'ArrowDown' })
    expect(options[1]).toHaveFocus()
    expect(options[1]).toHaveAttribute('tabindex', '0')
    expect(options[0]).toHaveAttribute('tabindex', '-1')

    // Wrap around to first
    fireEvent.keyDown(listbox, { key: 'ArrowDown' })
    expect(options[0]).toHaveFocus()
  })

  it('ArrowUp moves focus to previous option and wraps at start (W38)', () => {
    renderModal({
      attributedIntercessors: [
        { userId: 'f1', displayName: 'Friend One', avatarUrl: null },
        { userId: 'f2', displayName: 'Friend Two', avatarUrl: null },
      ],
      totalCount: 2,
    })
    const listbox = screen.getByRole('listbox', { name: /intercessors/i })
    const options = screen.getAllByRole('option')

    // From index 0, ArrowUp wraps to last
    fireEvent.keyDown(listbox, { key: 'ArrowUp' })
    expect(options[1]).toHaveFocus()

    fireEvent.keyDown(listbox, { key: 'ArrowUp' })
    expect(options[0]).toHaveFocus()
  })

  it('Home / End jump to first / last option (W38)', () => {
    const friends: AttributedIntercessor[] = Array.from({ length: 5 }, (_, i) => ({
      userId: `f${i}`,
      displayName: `Friend ${i}`,
      avatarUrl: null,
    }))
    renderModal({ attributedIntercessors: friends, totalCount: 5 })
    const listbox = screen.getByRole('listbox', { name: /intercessors/i })
    const options = screen.getAllByRole('option')

    fireEvent.keyDown(listbox, { key: 'End' })
    expect(options[4]).toHaveFocus()

    fireEvent.keyDown(listbox, { key: 'Home' })
    expect(options[0]).toHaveFocus()
  })

  it('arrow-key navigation reaches anonymous rows (mixed friends + anon)', () => {
    renderModal({
      attributedIntercessors: [
        { userId: 'f1', displayName: 'Friend One', avatarUrl: null },
      ],
      anonymousCount: 2,
      totalCount: 3,
    })
    const listbox = screen.getByRole('listbox', { name: /intercessors/i })
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)

    fireEvent.keyDown(listbox, { key: 'ArrowDown' })
    expect(options[1]).toHaveFocus()
    expect(options[1]).toHaveTextContent('A friend')

    fireEvent.keyDown(listbox, { key: 'ArrowDown' })
    expect(options[2]).toHaveFocus()
    expect(options[2]).toHaveTextContent('A friend')
  })

  it('overflow summary row is NOT in the option list (role=presentation, not navigated)', () => {
    // 11 friends → 10 visible + 1 overflow summary row
    const friends: AttributedIntercessor[] = Array.from({ length: 11 }, (_, i) => ({
      userId: `f${i}`,
      displayName: `Friend ${i}`,
      avatarUrl: null,
    }))
    renderModal({ attributedIntercessors: friends, totalCount: 11 })
    const options = screen.getAllByRole('option')
    // Only the 10 navigable rows are options; overflow is presentational.
    expect(options).toHaveLength(10)
  })

  it('does NOT include any DOM marker tagged with non-friend user_id (Gate-32 defense in depth)', () => {
    // We pass NO non-friend user_id (only anonymousCount is set). Modal should
    // render "A friend" placeholders and NOTHING with a non-friend identifier.
    const { container } = renderModal({
      attributedIntercessors: [
        { userId: 'friend-uuid-1', displayName: 'Friend', avatarUrl: null },
      ],
      anonymousCount: 5,
      totalCount: 6,
    })
    // No data-user-id attribute anywhere
    expect(container.querySelector('[data-user-id]')).toBeNull()
    // No timestamps anywhere (privacy — "ago", "yesterday", "today" etc.)
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/\bago\b/i)
    expect(text).not.toMatch(/\byesterday\b/i)
    expect(text).not.toMatch(/\d+m ago\b/i)
  })
})
