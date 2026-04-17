// BB-49 end-to-end integration test.
//
// Proves the handoff contract: user types a reference into BibleSearchEntry,
// submits, and the URL parameters expose the expected book/chapter/?verse=
// route. We render with a real MemoryRouter (no useNavigate mock) so
// navigation actually happens and a probe component reads useParams /
// useSearchParams to assert the URL contract.
//
// The probe is intentionally lightweight — we do NOT mount the real
// BibleReader here because the required providers (AudioProvider,
// BibleDrawerProvider, etc.) make the test brittle. BB-38's verse-scroll
// contract is independently covered by BibleReader.deeplink.test.tsx; this
// test only validates that the parser drives the right URL.
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams, useSearchParams } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { BibleSearchEntry } from '../BibleSearchEntry'

function RouteParamsProbe() {
  const params = useParams()
  const [searchParams] = useSearchParams()
  return (
    <div>
      <span data-testid="route-book">{params.book ?? ''}</span>
      <span data-testid="route-chapter">{params.chapter ?? ''}</span>
      <span data-testid="route-verse">{searchParams.get('verse') ?? ''}</span>
    </div>
  )
}

function SearchLandingProbe() {
  const [searchParams] = useSearchParams()
  return <span data-testid="search-q">{searchParams.get('q') ?? ''}</span>
}

describe('BibleSearchEntry — end-to-end URL handoff', () => {
  it('typing "John 3:16" + Enter lands on /bible/john/3?verse=16', async () => {
    render(
      <MemoryRouter initialEntries={['/bible']}>
        <Routes>
          <Route path="/bible" element={<BibleSearchEntry />} />
          <Route path="/bible/:book/:chapter" element={<RouteParamsProbe />} />
          <Route path="/bible/search" element={<SearchLandingProbe />} />
        </Routes>
      </MemoryRouter>,
    )
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'John 3:16' } })
    fireEvent.submit(input)

    expect(await screen.findByTestId('route-book')).toHaveTextContent('john')
    expect(screen.getByTestId('route-chapter')).toHaveTextContent('3')
    expect(screen.getByTestId('route-verse')).toHaveTextContent('16')
  })

  it('typing "1 John 4:8" + Enter resolves numbered-book slug', async () => {
    render(
      <MemoryRouter initialEntries={['/bible']}>
        <Routes>
          <Route path="/bible" element={<BibleSearchEntry />} />
          <Route path="/bible/:book/:chapter" element={<RouteParamsProbe />} />
        </Routes>
      </MemoryRouter>,
    )
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: '1 John 4:8' } })
    fireEvent.submit(input)

    expect(await screen.findByTestId('route-book')).toHaveTextContent('1-john')
    expect(screen.getByTestId('route-chapter')).toHaveTextContent('4')
    expect(screen.getByTestId('route-verse')).toHaveTextContent('8')
  })

  it('typing "love" + Enter falls through to /bible/search?q=love', async () => {
    render(
      <MemoryRouter initialEntries={['/bible']}>
        <Routes>
          <Route path="/bible" element={<BibleSearchEntry />} />
          <Route path="/bible/search" element={<SearchLandingProbe />} />
        </Routes>
      </MemoryRouter>,
    )
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'love' } })
    fireEvent.submit(input)

    expect(await screen.findByTestId('search-q')).toHaveTextContent('love')
  })
})
