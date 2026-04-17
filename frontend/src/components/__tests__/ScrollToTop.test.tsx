import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { ScrollToTop } from '../ScrollToTop'

describe('ScrollToTop', () => {
  let scrollSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  afterEach(() => {
    scrollSpy.mockRestore()
  })

  it('fires once on initial mount', () => {
    render(
      <MemoryRouter initialEntries={['/a']}>
        <ScrollToTop />
      </MemoryRouter>,
    )
    expect(scrollSpy).toHaveBeenCalledTimes(1)
    expect(scrollSpy).toHaveBeenCalledWith(0, 0)
  })

  it('fires once per pathname change', () => {
    function PathnameChanger() {
      const navigate = useNavigate()
      useEffect(() => {
        navigate('/b')
      }, [navigate])
      return null
    }

    render(
      <MemoryRouter initialEntries={['/a']}>
        <ScrollToTop />
        <PathnameChanger />
      </MemoryRouter>,
    )

    // Initial mount + 1 nav = 2 calls
    expect(scrollSpy).toHaveBeenCalledTimes(2)
    expect(scrollSpy).toHaveBeenNthCalledWith(1, 0, 0)
    expect(scrollSpy).toHaveBeenNthCalledWith(2, 0, 0)
  })

  it('does NOT fire again for hash-only changes', () => {
    function HashChanger() {
      const navigate = useNavigate()
      useEffect(() => {
        navigate('/a#section')
      }, [navigate])
      return null
    }

    render(
      <MemoryRouter initialEntries={['/a']}>
        <ScrollToTop />
        <HashChanger />
      </MemoryRouter>,
    )

    // Only initial mount should scroll — hash change doesn't affect pathname
    expect(scrollSpy).toHaveBeenCalledTimes(1)
  })

  it('does NOT fire again for search-param-only changes', () => {
    function SearchChanger() {
      const navigate = useNavigate()
      useEffect(() => {
        navigate('/a?x=2')
      }, [navigate])
      return null
    }

    render(
      <MemoryRouter initialEntries={['/a?x=1']}>
        <ScrollToTop />
        <SearchChanger />
      </MemoryRouter>,
    )

    // Only initial mount — search change doesn't affect pathname
    expect(scrollSpy).toHaveBeenCalledTimes(1)
  })
})
