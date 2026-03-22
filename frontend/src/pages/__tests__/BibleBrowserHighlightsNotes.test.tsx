import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BibleBrowser } from '../BibleBrowser'

const mockAuth = {
  isAuthenticated: false,
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}))

vi.mock('@/hooks/useNotificationActions', () => ({
  useNotificationActions: () => ({
    notifications: [],
    unreadCount: 0,
    markAllAsRead: vi.fn(),
    markAsRead: vi.fn(),
    clearAll: vi.fn(),
  }),
}))

vi.mock('@/data/bible', async () => {
  const actual = await vi.importActual('@/data/bible')
  return {
    ...actual,
    loadChapter: vi.fn().mockResolvedValue(null),
  }
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/bible']}>
      <BibleBrowser />
    </MemoryRouter>,
  )
}

describe('BibleBrowser — My Highlights & Notes Section', () => {
  beforeEach(() => {
    localStorage.clear()
    mockAuth.isAuthenticated = false
  })

  it('section not visible when logged out', () => {
    // Seed some data
    localStorage.setItem(
      'wr_bible_highlights',
      JSON.stringify([
        { book: 'genesis', chapter: 1, verseNumber: 1, color: '#FBBF24', createdAt: new Date().toISOString() },
      ]),
    )
    renderPage()
    expect(screen.queryByText('My Highlights & Notes')).not.toBeInTheDocument()
  })

  it('section not visible when logged in but no data', () => {
    mockAuth.isAuthenticated = true
    renderPage()
    expect(screen.queryByText('My Highlights & Notes')).not.toBeInTheDocument()
  })

  it('section visible when logged in with highlights', () => {
    mockAuth.isAuthenticated = true
    localStorage.setItem(
      'wr_bible_highlights',
      JSON.stringify([
        { book: 'genesis', chapter: 1, verseNumber: 1, color: '#FBBF24', createdAt: new Date().toISOString() },
      ]),
    )
    renderPage()
    expect(screen.getByText('My Highlights & Notes')).toBeInTheDocument()
    expect(screen.getByText('1 items')).toBeInTheDocument()
  })

  it('section visible when logged in with notes', () => {
    mockAuth.isAuthenticated = true
    localStorage.setItem(
      'wr_bible_notes',
      JSON.stringify([
        {
          id: 'note-1',
          book: 'genesis',
          chapter: 1,
          verseNumber: 1,
          text: 'A note',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]),
    )
    renderPage()
    expect(screen.getByText('My Highlights & Notes')).toBeInTheDocument()
  })

  it('count badge shows total highlights + notes', () => {
    mockAuth.isAuthenticated = true
    localStorage.setItem(
      'wr_bible_highlights',
      JSON.stringify([
        { book: 'genesis', chapter: 1, verseNumber: 1, color: '#FBBF24', createdAt: new Date().toISOString() },
        { book: 'genesis', chapter: 1, verseNumber: 2, color: '#34D399', createdAt: new Date().toISOString() },
      ]),
    )
    localStorage.setItem(
      'wr_bible_notes',
      JSON.stringify([
        {
          id: 'note-1',
          book: 'genesis',
          chapter: 1,
          verseNumber: 1,
          text: 'Note',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]),
    )
    renderPage()
    expect(screen.getByText('3 items')).toBeInTheDocument()
  })
})
