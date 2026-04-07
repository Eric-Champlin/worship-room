import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { BibleDrawerProvider, useBibleDrawer } from '../BibleDrawerProvider'

function TestConsumer() {
  const { isOpen, open, close, toggle } = useBibleDrawer()
  return (
    <div>
      <span data-testid="state">{isOpen ? 'open' : 'closed'}</span>
      <button onClick={open}>open</button>
      <button onClick={close}>close</button>
      <button onClick={toggle}>toggle</button>
    </div>
  )
}

describe('BibleDrawerProvider', () => {
  it('provides default closed state', () => {
    render(
      <BibleDrawerProvider>
        <TestConsumer />
      </BibleDrawerProvider>
    )
    expect(screen.getByTestId('state')).toHaveTextContent('closed')
  })

  it('open() sets isOpen to true', () => {
    render(
      <BibleDrawerProvider>
        <TestConsumer />
      </BibleDrawerProvider>
    )
    act(() => screen.getByText('open').click())
    expect(screen.getByTestId('state')).toHaveTextContent('open')
  })

  it('close() sets isOpen to false', () => {
    render(
      <BibleDrawerProvider>
        <TestConsumer />
      </BibleDrawerProvider>
    )
    act(() => screen.getByText('open').click())
    expect(screen.getByTestId('state')).toHaveTextContent('open')
    act(() => screen.getByText('close').click())
    expect(screen.getByTestId('state')).toHaveTextContent('closed')
  })

  it('toggle() flips isOpen', () => {
    render(
      <BibleDrawerProvider>
        <TestConsumer />
      </BibleDrawerProvider>
    )
    act(() => screen.getByText('toggle').click())
    expect(screen.getByTestId('state')).toHaveTextContent('open')
    act(() => screen.getByText('toggle').click())
    expect(screen.getByTestId('state')).toHaveTextContent('closed')
  })

  it('throws when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => {
      renderHook(() => useBibleDrawer())
    }).toThrow('useBibleDrawer must be used within BibleDrawerProvider')
    consoleSpy.mockRestore()
  })
})
