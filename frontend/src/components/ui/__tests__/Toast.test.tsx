import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ToastProvider, useToast } from '../Toast'

function TestComponent() {
  const { showToast } = useToast()
  return (
    <button onClick={() => showToast('Test message', 'success')}>
      Show Toast
    </button>
  )
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <TestComponent />
    </ToastProvider>,
  )
}

describe('Toast', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('showToast renders a toast message', () => {
    renderWithProvider()
    act(() => {
      screen.getByText('Show Toast').click()
    })
    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  it('Toast auto-dismisses after 6 seconds', () => {
    vi.useFakeTimers()
    renderWithProvider()
    act(() => {
      screen.getByText('Show Toast').click()
    })
    expect(screen.getByText('Test message')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(screen.queryByText('Test message')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('renders toast container with role="status"', () => {
    renderWithProvider()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('limits to 3 toasts visible at once', () => {
    function MultiToastTest() {
      const { showToast } = useToast()
      return (
        <button
          onClick={() => {
            showToast('Toast 1')
            showToast('Toast 2')
            showToast('Toast 3')
            showToast('Toast 4')
          }}
        >
          Show Many
        </button>
      )
    }

    render(
      <ToastProvider>
        <MultiToastTest />
      </ToastProvider>,
    )

    act(() => {
      screen.getByText('Show Many').click()
    })

    const statusContainer = screen.getByRole('status')
    const toasts = statusContainer.querySelectorAll('div > p')
    expect(toasts.length).toBeLessThanOrEqual(3)
  })
})
