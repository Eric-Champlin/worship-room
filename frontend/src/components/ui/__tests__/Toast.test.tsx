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

  it('success toast has role="status" and error toast has role="alert"', () => {
    function RoleTestComponent() {
      const { showToast } = useToast()
      return (
        <>
          <button onClick={() => showToast('Success msg', 'success')}>Success</button>
          <button onClick={() => showToast('Error msg', 'error')}>Error</button>
        </>
      )
    }
    render(
      <ToastProvider>
        <RoleTestComponent />
      </ToastProvider>,
    )
    act(() => { screen.getByText('Success').click() })
    expect(screen.getByRole('status')).toHaveTextContent('Success msg')

    act(() => { screen.getByText('Error').click() })
    expect(screen.getByRole('alert')).toHaveTextContent('Error msg')
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

    const toasts = screen.getAllByRole('status')
    expect(toasts.length).toBeLessThanOrEqual(3)
  })
})
