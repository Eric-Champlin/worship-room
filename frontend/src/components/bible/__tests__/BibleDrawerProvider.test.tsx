import type React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { BibleDrawerProvider, useBibleDrawer } from '../BibleDrawerProvider'

const STACK_KEY = 'wr_bible_drawer_stack'

function TestConsumer() {
  const { isOpen, open, close, toggle, pushView, popView, resetStack, currentView, viewStack } =
    useBibleDrawer()
  return (
    <div>
      <span data-testid="state">{isOpen ? 'open' : 'closed'}</span>
      <span data-testid="current-type">{currentView.type}</span>
      <span data-testid="current-slug">
        {currentView.type === 'chapters' ? currentView.bookSlug : ''}
      </span>
      <span data-testid="stack-length">{viewStack.length}</span>
      <button onClick={() => open()}>open</button>
      <button onClick={() => open({ type: 'chapters', bookSlug: 'john' })}>open-chapters</button>
      <button onClick={close}>close</button>
      <button onClick={toggle}>toggle</button>
      <button onClick={() => pushView({ type: 'chapters', bookSlug: 'genesis' })}>push</button>
      <button onClick={popView}>pop</button>
      <button onClick={resetStack}>reset</button>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('BibleDrawerProvider', () => {
  it('provides default closed state', () => {
    render(
      <BibleDrawerProvider>
        <TestConsumer />
      </BibleDrawerProvider>,
    )
    expect(screen.getByTestId('state')).toHaveTextContent('closed')
    expect(screen.getByTestId('current-type')).toHaveTextContent('books')
  })

  it('open() with no args sets stack to [books]', () => {
    render(
      <BibleDrawerProvider>
        <TestConsumer />
      </BibleDrawerProvider>,
    )
    act(() => screen.getByText('open').click())
    expect(screen.getByTestId('state')).toHaveTextContent('open')
    expect(screen.getByTestId('current-type')).toHaveTextContent('books')
    expect(screen.getByTestId('stack-length')).toHaveTextContent('1')
  })

  it('open(chapters view) sets pre-pushed stack', () => {
    render(
      <BibleDrawerProvider>
        <TestConsumer />
      </BibleDrawerProvider>,
    )
    act(() => screen.getByText('open-chapters').click())
    expect(screen.getByTestId('state')).toHaveTextContent('open')
    expect(screen.getByTestId('current-type')).toHaveTextContent('chapters')
    expect(screen.getByTestId('current-slug')).toHaveTextContent('john')
    expect(screen.getByTestId('stack-length')).toHaveTextContent('2')
  })

  it('pushView adds to stack', () => {
    render(
      <BibleDrawerProvider>
        <TestConsumer />
      </BibleDrawerProvider>,
    )
    act(() => screen.getByText('open').click())
    act(() => screen.getByText('push').click())
    expect(screen.getByTestId('stack-length')).toHaveTextContent('2')
    expect(screen.getByTestId('current-type')).toHaveTextContent('chapters')
    expect(screen.getByTestId('current-slug')).toHaveTextContent('genesis')
  })

  it('popView removes top view', () => {
    render(
      <BibleDrawerProvider>
        <TestConsumer />
      </BibleDrawerProvider>,
    )
    act(() => screen.getByText('open').click())
    act(() => screen.getByText('push').click())
    expect(screen.getByTestId('stack-length')).toHaveTextContent('2')
    act(() => screen.getByText('pop').click())
    expect(screen.getByTestId('stack-length')).toHaveTextContent('1')
    expect(screen.getByTestId('current-type')).toHaveTextContent('books')
  })

  it('popView does not remove last view', () => {
    render(
      <BibleDrawerProvider>
        <TestConsumer />
      </BibleDrawerProvider>,
    )
    act(() => screen.getByText('open').click())
    expect(screen.getByTestId('stack-length')).toHaveTextContent('1')
    act(() => screen.getByText('pop').click())
    expect(screen.getByTestId('stack-length')).toHaveTextContent('1')
    expect(screen.getByTestId('current-type')).toHaveTextContent('books')
  })

  it('resetStack returns to [books]', () => {
    render(
      <BibleDrawerProvider>
        <TestConsumer />
      </BibleDrawerProvider>,
    )
    act(() => screen.getByText('open').click())
    act(() => screen.getByText('push').click())
    expect(screen.getByTestId('stack-length')).toHaveTextContent('2')
    act(() => screen.getByText('reset').click())
    expect(screen.getByTestId('stack-length')).toHaveTextContent('1')
    expect(screen.getByTestId('current-type')).toHaveTextContent('books')
  })

  it('close persists stack to localStorage', () => {
    render(
      <BibleDrawerProvider>
        <TestConsumer />
      </BibleDrawerProvider>,
    )
    act(() => screen.getByText('open').click())
    act(() => screen.getByText('push').click())
    act(() => screen.getByText('close').click())
    expect(screen.getByTestId('state')).toHaveTextContent('closed')
    const stored = JSON.parse(localStorage.getItem(STACK_KEY)!)
    expect(stored.stack).toHaveLength(2)
    expect(stored.stack[1].type).toBe('chapters')
    expect(stored.timestamp).toBeGreaterThan(0)
  })

  it('open rehydrates from localStorage within 24h', () => {
    localStorage.setItem(
      STACK_KEY,
      JSON.stringify({
        stack: [{ type: 'books' }, { type: 'chapters', bookSlug: 'romans' }],
        timestamp: Date.now() - 1000, // 1 second ago
      }),
    )
    render(
      <BibleDrawerProvider>
        <TestConsumer />
      </BibleDrawerProvider>,
    )
    act(() => screen.getByText('open').click())
    expect(screen.getByTestId('stack-length')).toHaveTextContent('2')
    expect(screen.getByTestId('current-type')).toHaveTextContent('chapters')
    expect(screen.getByTestId('current-slug')).toHaveTextContent('romans')
  })

  it('open ignores stale stack (>24h)', () => {
    localStorage.setItem(
      STACK_KEY,
      JSON.stringify({
        stack: [{ type: 'books' }, { type: 'chapters', bookSlug: 'romans' }],
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      }),
    )
    render(
      <BibleDrawerProvider>
        <TestConsumer />
      </BibleDrawerProvider>,
    )
    act(() => screen.getByText('open').click())
    expect(screen.getByTestId('stack-length')).toHaveTextContent('1')
    expect(screen.getByTestId('current-type')).toHaveTextContent('books')
  })

  it('open(explicit view) ignores persistence', () => {
    localStorage.setItem(
      STACK_KEY,
      JSON.stringify({
        stack: [{ type: 'books' }, { type: 'chapters', bookSlug: 'romans' }],
        timestamp: Date.now() - 1000,
      }),
    )
    render(
      <BibleDrawerProvider>
        <TestConsumer />
      </BibleDrawerProvider>,
    )
    act(() => screen.getByText('open-chapters').click())
    // Should use the explicit john view, not the persisted romans
    expect(screen.getByTestId('current-slug')).toHaveTextContent('john')
  })

  it('currentView returns top of stack', () => {
    render(
      <BibleDrawerProvider>
        <TestConsumer />
      </BibleDrawerProvider>,
    )
    act(() => screen.getByText('open').click())
    act(() => screen.getByText('push').click())
    expect(screen.getByTestId('current-type')).toHaveTextContent('chapters')
    expect(screen.getByTestId('current-slug')).toHaveTextContent('genesis')
  })

  it('toggle opens when closed', () => {
    render(
      <BibleDrawerProvider>
        <TestConsumer />
      </BibleDrawerProvider>,
    )
    act(() => screen.getByText('toggle').click())
    expect(screen.getByTestId('state')).toHaveTextContent('open')
  })

  it('toggle closes when open', () => {
    render(
      <BibleDrawerProvider>
        <TestConsumer />
      </BibleDrawerProvider>,
    )
    act(() => screen.getByText('open').click())
    act(() => screen.getByText('toggle').click())
    expect(screen.getByTestId('state')).toHaveTextContent('closed')
  })

  it('returnFocusSlugRef is available and mutable', () => {
    let ref: React.MutableRefObject<string | null> | null = null
    function RefConsumer() {
      const ctx = useBibleDrawer()
      ref = ctx.returnFocusSlugRef
      return null
    }
    render(
      <BibleDrawerProvider>
        <RefConsumer />
      </BibleDrawerProvider>,
    )
    expect(ref).not.toBeNull()
    expect(ref!.current).toBeNull()
    ref!.current = 'genesis'
    expect(ref!.current).toBe('genesis')
  })

  it('throws when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => {
      renderHook(() => useBibleDrawer())
    }).toThrow('useBibleDrawer must be used within BibleDrawerProvider')
    consoleSpy.mockRestore()
  })
})
