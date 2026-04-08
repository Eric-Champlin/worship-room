import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { MeditateTabContent } from '../MeditateTabContent'

let mockReducedMotion = false

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReducedMotion,
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0,
    currentLevel: 1,
    levelName: 'Seedling',
    pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false },
    todayPoints: 0,
    todayMultiplier: 1,
    currentStreak: 0,
    longestStreak: 0,
    recordActivity: vi.fn(),
  }),
}))

// Mock loadChapterWeb for Bible bridge verse hydration
const mockLoadChapterWeb = vi.fn()
vi.mock('@/data/bible/index', () => ({
  loadChapterWeb: (...args: unknown[]) => mockLoadChapterWeb(...args),
}))

// Mock navigate to verify location.state passing
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const PSALM_46_CHAPTER = {
  book: 'psalms',
  chapter: 46,
  verses: Array.from({ length: 11 }, (_, i) => ({
    number: i + 1,
    text: i === 9
      ? 'Be still, and know that I am God. I will be exalted among the nations. I will be exalted in the earth.'
      : `Verse ${i + 1} text.`,
  })),
}

function renderMeditateTab(props: { isActive?: boolean; initialUrl?: string } = {}) {
  const initialEntries = props.initialUrl ? [props.initialUrl] : ['/daily?tab=meditate']
  return render(
    <MemoryRouter initialEntries={initialEntries} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <AuthModalProvider>
            <MeditateTabContent isActive={props.isActive ?? true} />
          </AuthModalProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  mockLoadChapterWeb.mockReset()
  mockNavigate.mockClear()
  mockReducedMotion = false
  Element.prototype.scrollIntoView = vi.fn()
})

describe('MeditateTabContent verse context (Bible bridge)', () => {
  it('renders VersePromptCard when verse params in URL', async () => {
    mockLoadChapterWeb.mockResolvedValue(PSALM_46_CHAPTER)
    renderMeditateTab({ initialUrl: '/daily?tab=meditate&verseBook=psalms&verseChapter=46&verseStart=10&verseEnd=10&src=bible' })

    const card = await screen.findByRole('region', { name: /verse prompt/i })
    expect(card).toBeInTheDocument()
    expect(screen.getByText('Psalms 46:10')).toBeInTheDocument()
    expect(screen.getByText(/Be still, and know that I am God/)).toBeInTheDocument()
    expect(screen.getByText('Return to these words whenever your mind wanders.')).toBeInTheDocument()
  })

  it('no card when no verse params', () => {
    renderMeditateTab({ initialUrl: '/daily?tab=meditate' })
    expect(screen.queryByRole('region', { name: /verse prompt/i })).not.toBeInTheDocument()
    // Meditation cards still render
    expect(screen.getByText('Breathing Exercise')).toBeInTheDocument()
    expect(screen.getByText('Scripture Soaking')).toBeInTheDocument()
  })

  it('removing card via X does not affect meditation cards', async () => {
    mockLoadChapterWeb.mockResolvedValue(PSALM_46_CHAPTER)
    const user = userEvent.setup()
    renderMeditateTab({ initialUrl: '/daily?tab=meditate&verseBook=psalms&verseChapter=46&verseStart=10&verseEnd=10&src=bible' })

    await screen.findByRole('region', { name: /verse prompt/i })
    const removeBtn = screen.getByRole('button', { name: /remove verse prompt/i })
    await user.click(removeBtn)
    expect(screen.queryByRole('region', { name: /verse prompt/i })).not.toBeInTheDocument()

    // All 6 meditation cards still present
    expect(screen.getByText('Breathing Exercise')).toBeInTheDocument()
    expect(screen.getByText('Scripture Soaking')).toBeInTheDocument()
    expect(screen.getByText('Gratitude Reflection')).toBeInTheDocument()
    expect(screen.getByText('ACTS Prayer Walk')).toBeInTheDocument()
    expect(screen.getByText('Psalm Reading')).toBeInTheDocument()
    expect(screen.getByText('Examen')).toBeInTheDocument()
  })

  it('skeleton shows during hydration', async () => {
    let resolveLoadChapter: (value: unknown) => void
    mockLoadChapterWeb.mockReturnValue(
      new Promise((resolve) => {
        resolveLoadChapter = resolve
      }),
    )

    const { container } = renderMeditateTab({
      initialUrl: '/daily?tab=meditate&verseBook=psalms&verseChapter=46&verseStart=10&verseEnd=10&src=bible',
    })

    // Skeleton should appear (has animate-pulse elements)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })
    const pulseElements = container.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(0)

    // Resolve the promise to clean up
    await act(async () => {
      resolveLoadChapter!(PSALM_46_CHAPTER)
    })
  })

  it('invalid params show no card', () => {
    mockLoadChapterWeb.mockResolvedValue(null)
    renderMeditateTab({ initialUrl: '/daily?tab=meditate&verseBook=invalid&verseChapter=abc&verseStart=1&verseEnd=1&src=bible' })
    expect(screen.queryByRole('region', { name: /verse prompt/i })).not.toBeInTheDocument()
    // Meditation cards still render
    expect(screen.getByText('Breathing Exercise')).toBeInTheDocument()
  })

  it('all-complete banner and verse card coexist', async () => {
    mockLoadChapterWeb.mockResolvedValue(PSALM_46_CHAPTER)
    localStorage.setItem('wr_auth_simulated', 'true')
    localStorage.setItem('wr_user_name', 'Test User')
    // Mark all 6 meditation types as complete today
    const today = new Date().toISOString().slice(0, 10)
    const completionData = {
      date: today,
      pray: false,
      journal: false,
      meditate: { completed: true, types: ['breathing', 'soaking', 'gratitude', 'acts', 'psalm', 'examen'] },
      guidedPrayer: [],
    }
    localStorage.setItem('wr_daily_completion', JSON.stringify(completionData))

    renderMeditateTab({ initialUrl: '/daily?tab=meditate&verseBook=psalms&verseChapter=46&verseStart=10&verseEnd=10&src=bible' })

    // Verse card renders
    const card = await screen.findByRole('region', { name: /verse prompt/i })
    expect(card).toBeInTheDocument()

    // All-complete banner also renders
    expect(screen.getByText(/You completed all 6 meditations today/)).toBeInTheDocument()
  })

  it('card click passes meditationVerseContext in state', async () => {
    mockLoadChapterWeb.mockResolvedValue(PSALM_46_CHAPTER)
    localStorage.setItem('wr_auth_simulated', 'true')
    localStorage.setItem('wr_user_name', 'Test User')
    const user = userEvent.setup()

    renderMeditateTab({ initialUrl: '/daily?tab=meditate&verseBook=psalms&verseChapter=46&verseStart=10&verseEnd=10&src=bible' })

    await screen.findByRole('region', { name: /verse prompt/i })

    const breathingCard = screen.getByText('Breathing Exercise').closest('button')!
    await user.click(breathingCard)

    expect(mockNavigate).toHaveBeenCalledWith('/meditate/breathing', {
      state: {
        meditationVerseContext: {
          book: 'psalms',
          chapter: 46,
          startVerse: 10,
          endVerse: 10,
          reference: 'Psalms 46:10',
        },
      },
    })
  })

  it('verse context clears when isActive becomes false', async () => {
    mockLoadChapterWeb.mockResolvedValue(PSALM_46_CHAPTER)

    const { rerender } = renderMeditateTab({
      isActive: true,
      initialUrl: '/daily?tab=meditate&verseBook=psalms&verseChapter=46&verseStart=10&verseEnd=10&src=bible',
    })

    await screen.findByRole('region', { name: /verse prompt/i })

    // Rerender with isActive=false
    rerender(
      <MemoryRouter initialEntries={['/daily?tab=meditate']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ToastProvider>
            <AuthModalProvider>
              <MeditateTabContent isActive={false} />
            </AuthModalProvider>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.queryByRole('region', { name: /verse prompt/i })).not.toBeInTheDocument()
  })
})
