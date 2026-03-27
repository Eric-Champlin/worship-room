import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useStaggeredEntrance } from '../useStaggeredEntrance'

// Mock useReducedMotion
vi.mock('../useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

// Mock useInView
vi.mock('../useInView', () => ({
  useInView: vi.fn(() => {
    const ref = { current: null }
    return [ref, false] as const
  }),
}))

import { useReducedMotion } from '../useReducedMotion'
import { useInView } from '../useInView'

const mockedUseReducedMotion = vi.mocked(useReducedMotion)
const mockedUseInView = vi.mocked(useInView)

describe('useStaggeredEntrance', () => {
  beforeEach(() => {
    mockedUseReducedMotion.mockReturnValue(false)
    mockedUseInView.mockReturnValue([{ current: null }, false] as unknown as ReturnType<typeof useInView>)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns opacity-0 when not in view', () => {
    mockedUseInView.mockReturnValue([{ current: null }, false] as unknown as ReturnType<typeof useInView>)

    const { result } = renderHook(() =>
      useStaggeredEntrance({ staggerDelay: 50, itemCount: 5 }),
    )

    const props = result.current.getStaggerProps(0)
    expect(props.className).toBe('opacity-0')
    expect(props.style).toEqual({})
  })

  it('returns stagger-enter class when in view', () => {
    mockedUseInView.mockReturnValue([{ current: null }, true] as unknown as ReturnType<typeof useInView>)

    const { result } = renderHook(() =>
      useStaggeredEntrance({ staggerDelay: 50, itemCount: 5 }),
    )

    const props = result.current.getStaggerProps(0)
    expect(props.className).toBe('motion-safe:animate-stagger-enter')
    expect(props.style).toEqual({ animationDelay: '0ms' })
  })

  it('computes correct delay for each index', () => {
    mockedUseInView.mockReturnValue([{ current: null }, true] as unknown as ReturnType<typeof useInView>)

    const { result } = renderHook(() =>
      useStaggeredEntrance({ staggerDelay: 50, itemCount: 5 }),
    )

    expect(result.current.getStaggerProps(0).style).toEqual({ animationDelay: '0ms' })
    expect(result.current.getStaggerProps(1).style).toEqual({ animationDelay: '50ms' })
    expect(result.current.getStaggerProps(2).style).toEqual({ animationDelay: '100ms' })
    expect(result.current.getStaggerProps(3).style).toEqual({ animationDelay: '150ms' })
  })

  it('returns empty props with reduced motion', () => {
    mockedUseReducedMotion.mockReturnValue(true)
    mockedUseInView.mockReturnValue([{ current: null }, true] as unknown as ReturnType<typeof useInView>)

    const { result } = renderHook(() =>
      useStaggeredEntrance({ staggerDelay: 50, itemCount: 5 }),
    )

    const props = result.current.getStaggerProps(0)
    expect(props.className).toBe('')
    expect(props.style).toEqual({})
  })

  it('containerRef is a valid ref object', () => {
    const { result } = renderHook(() =>
      useStaggeredEntrance({ staggerDelay: 50, itemCount: 5 }),
    )

    expect(result.current.containerRef).toBeDefined()
    expect(result.current.containerRef).toHaveProperty('current')
  })

  it('uses external inView prop when provided', () => {
    // Default useInView returns false, but we override with inView=true
    mockedUseInView.mockReturnValue([{ current: null }, false] as unknown as ReturnType<typeof useInView>)

    const { result } = renderHook(() =>
      useStaggeredEntrance({ staggerDelay: 50, itemCount: 5, inView: true }),
    )

    const props = result.current.getStaggerProps(0)
    expect(props.className).toBe('motion-safe:animate-stagger-enter')
  })
})
