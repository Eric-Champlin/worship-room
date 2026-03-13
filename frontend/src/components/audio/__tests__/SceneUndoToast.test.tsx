import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SceneUndoToast } from '../SceneUndoToast'

describe('SceneUndoToast', () => {
  it('renders with scene name', () => {
    render(
      <SceneUndoToast undoAvailable={true} sceneName="Garden of Gethsemane" onUndo={vi.fn()} />,
    )
    expect(screen.getByText('Switched to Garden of Gethsemane.')).toBeInTheDocument()
  })

  it('has role="status" with aria-live="polite"', () => {
    render(
      <SceneUndoToast undoAvailable={true} sceneName="Garden of Gethsemane" onUndo={vi.fn()} />,
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })

  it('undo button calls callback', async () => {
    const user = userEvent.setup()
    const onUndo = vi.fn()
    render(
      <SceneUndoToast undoAvailable={true} sceneName="Garden of Gethsemane" onUndo={onUndo} />,
    )

    await user.click(screen.getByText('Undo'))
    expect(onUndo).toHaveBeenCalledOnce()
  })

  it('live region persists but content hidden when undoAvailable is false', () => {
    render(
      <SceneUndoToast undoAvailable={false} sceneName="Garden of Gethsemane" onUndo={vi.fn()} />,
    )
    // Live region container stays mounted
    expect(screen.getByRole('status')).toBeInTheDocument()
    // But no toast content
    expect(screen.queryByText(/Switched to/)).not.toBeInTheDocument()
  })
})
