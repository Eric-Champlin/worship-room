import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RestoreDraftPrompt } from '../RestoreDraftPrompt'

describe('RestoreDraftPrompt', () => {
  it('T5: renders body copy with timeAgo output for a fresh timestamp', () => {
    // 5 minutes in the past → timeAgo should render "5 minutes ago".
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    render(
      <RestoreDraftPrompt
        draftTimestamp={fiveMinutesAgo}
        onRestore={() => {}}
        onDiscard={() => {}}
      />,
    )
    expect(
      screen.getByText(/You have a saved draft from .* ago\. Restore it\?/),
    ).toBeInTheDocument()
  })

  it('T6: tapping "Restore draft" invokes onRestore (not onDiscard)', async () => {
    const onRestore = vi.fn()
    const onDiscard = vi.fn()
    render(
      <RestoreDraftPrompt
        draftTimestamp={Date.now() - 60_000}
        onRestore={onRestore}
        onDiscard={onDiscard}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /restore draft/i }))
    expect(onRestore).toHaveBeenCalledTimes(1)
    expect(onDiscard).not.toHaveBeenCalled()
  })

  it('T7: tapping "Start fresh" invokes onDiscard (not onRestore)', async () => {
    const onRestore = vi.fn()
    const onDiscard = vi.fn()
    render(
      <RestoreDraftPrompt
        draftTimestamp={Date.now() - 60_000}
        onRestore={onRestore}
        onDiscard={onDiscard}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /start fresh/i }))
    expect(onDiscard).toHaveBeenCalledTimes(1)
    expect(onRestore).not.toHaveBeenCalled()
  })

  it('T12: primary "Restore draft" button receives focus on appearance', async () => {
    render(
      <RestoreDraftPrompt
        draftTimestamp={Date.now() - 60_000}
        onRestore={() => {}}
        onDiscard={() => {}}
      />,
    )
    // Focus is rAF-deferred to survive a closing modal's focus-trap restore
    // (see RestoreDraftPrompt.tsx). Wait for the next paint before asserting.
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /restore draft/i }),
      ).toHaveFocus(),
    )
  })

  it('T12b: focus survives a competing focus() call before the next frame', async () => {
    // Regression for the ComposerChooser focus-restore race: the chooser's
    // useFocusTrap restores focus to its trigger button ("Share something")
    // on close, which can run AFTER our synchronous focus() call. The rAF
    // deferral in RestoreDraftPrompt guarantees we land last.
    const triggerBtn = document.createElement('button')
    triggerBtn.textContent = 'Share something (stand-in trigger)'
    document.body.appendChild(triggerBtn)
    try {
      triggerBtn.focus()
      render(
        <RestoreDraftPrompt
          draftTimestamp={Date.now() - 60_000}
          onRestore={() => {}}
          onDiscard={() => {}}
        />,
      )
      // Synchronously re-steal focus, mimicking the focus-trap cleanup that
      // would otherwise win against a non-deferred focus() inside the prompt.
      triggerBtn.focus()
      expect(triggerBtn).toHaveFocus()
      // rAF fires on the next frame and lands focus on the Restore button.
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /restore draft/i }),
        ).toHaveFocus(),
      )
    } finally {
      triggerBtn.remove()
    }
  })

  it('uses role="status" + aria-live="polite" (not assertive)', () => {
    render(
      <RestoreDraftPrompt
        draftTimestamp={Date.now() - 60_000}
        onRestore={() => {}}
        onDiscard={() => {}}
      />,
    )
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })

  it('both buttons carry min-h-[44px] for 44px touch target compliance', () => {
    render(
      <RestoreDraftPrompt
        draftTimestamp={Date.now() - 60_000}
        onRestore={() => {}}
        onDiscard={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /restore draft/i })).toHaveClass(
      'min-h-[44px]',
    )
    expect(screen.getByRole('button', { name: /start fresh/i })).toHaveClass(
      'min-h-[44px]',
    )
  })
})
