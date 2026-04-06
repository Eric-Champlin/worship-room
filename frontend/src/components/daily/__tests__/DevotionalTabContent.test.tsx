import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { DevotionalTabContent } from '../DevotionalTabContent'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() })),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0, currentLevel: 1, levelName: 'Seedling', pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false, readingPlan: false, gratitude: false, reflection: false, challenge: false, localVisit: false, devotional: false },
    todayPoints: 0, todayMultiplier: 1, currentStreak: 0, longestStreak: 0,
    recordActivity: vi.fn(),
  }),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}))

vi.mock('@/hooks/useReadAloud', () => ({
  useReadAloud: () => ({
    state: 'idle',
    currentWordIndex: -1,
    play: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
  }),
}))

import { useAuth } from '@/hooks/useAuth'
const mockUseAuth = vi.mocked(useAuth)

beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
  mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() })
})

function renderComponent(initialEntry = '/daily?tab=devotional', props: Partial<React.ComponentProps<typeof DevotionalTabContent>> = {}) {
  return render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <DevotionalTabContent
            onSwitchToJournal={props.onSwitchToJournal ?? vi.fn()}
            onSwitchToPray={props.onSwitchToPray ?? vi.fn()}
            onComplete={props.onComplete ?? vi.fn()}
          />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('DevotionalTabContent', () => {
  describe('Rendering', () => {
    it('uses max-w-2xl container width', () => {
      const { container } = renderComponent()
      const maxWEl = container.querySelector('.max-w-2xl') as HTMLElement
      expect(maxWEl).not.toBeNull()
      expect(maxWEl.className).not.toContain('max-w-4xl')
    })

    it('renders devotional title as primary heading', () => {
      renderComponent()
      const headings = screen.getAllByRole('heading')
      // Only the devotional title heading remains (h3)
      expect(headings.length).toBeGreaterThanOrEqual(1)
      expect(headings[0].textContent).toBeTruthy()
    })

    it('renders formatted date', () => {
      renderComponent()
      const today = new Date()
      const formatted = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      expect(screen.getByText(formatted)).toBeInTheDocument()
    })

    it('renders quote section with blockquote', () => {
      renderComponent()
      expect(screen.getByRole('blockquote')).toBeInTheDocument()
    })

    it('renders decorative quotation mark as aria-hidden', () => {
      renderComponent()
      const decorativeQuote = screen.getByText('\u201C')
      expect(decorativeQuote).toHaveAttribute('aria-hidden', 'true')
    })

    it('does not render Closing Prayer section', () => {
      renderComponent()
      expect(screen.queryByText('Closing Prayer')).not.toBeInTheDocument()
    })

    it('renders reflection question', () => {
      renderComponent()
      expect(screen.getByText('Something to think about')).toBeInTheDocument()
    })

    it('renders Share and Read Aloud buttons', () => {
      renderComponent()
      expect(screen.getByText(/Share today/)).toBeInTheDocument()
      expect(screen.getByText('Read aloud')).toBeInTheDocument()
    })
  })

  describe('Date Navigation', () => {
    it('right arrow is disabled when on today', () => {
      renderComponent()
      const nextButton = screen.getByLabelText("Next day's devotional")
      expect(nextButton).toHaveAttribute('aria-disabled', 'true')
      expect(nextButton).toBeDisabled()
    })

    it('left arrow is disabled at day -7', () => {
      renderComponent('/daily?tab=devotional&day=-7')
      const prevButton = screen.getByLabelText("Previous day's devotional")
      expect(prevButton).toHaveAttribute('aria-disabled', 'true')
      expect(prevButton).toBeDisabled()
    })

    it('left arrow is enabled when on today', () => {
      renderComponent()
      const prevButton = screen.getByLabelText("Previous day's devotional")
      expect(prevButton).not.toBeDisabled()
    })

    it('browsing to previous day updates content', async () => {
      const user = userEvent.setup()
      renderComponent()
      const prevButton = screen.getByLabelText("Previous day's devotional")
      await user.click(prevButton)
      // Date should now show yesterday
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const formatted = yesterday.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      expect(screen.getByText(formatted)).toBeInTheDocument()
    })
  })

  describe('Cross-tab CTAs', () => {
    it('"Journal about this" calls onSwitchToJournal with theme and stripped reflection question', async () => {
      const onSwitchToJournal = vi.fn()
      const user = userEvent.setup()
      renderComponent('/daily?tab=devotional', { onSwitchToJournal })
      await user.click(screen.getByText(/Journal about this/))
      expect(onSwitchToJournal).toHaveBeenCalledTimes(1)
      // First arg: theme (string)
      expect(typeof onSwitchToJournal.mock.calls[0][0]).toBe('string')
      // Second arg: stripped reflection question (no "Something to think about today: " prefix)
      const customPrompt = onSwitchToJournal.mock.calls[0][1] as string
      expect(typeof customPrompt).toBe('string')
      expect(customPrompt).not.toContain('Something to think about today: ')
      expect(customPrompt.length).toBeGreaterThan(0)
    })

    it('"Pray about today\'s reading" calls onSwitchToPray with theme and rich context', async () => {
      const onSwitchToPray = vi.fn()
      const user = userEvent.setup()
      renderComponent('/daily?tab=devotional', { onSwitchToPray })
      await user.click(screen.getByText(/Pray about today/))
      expect(onSwitchToPray).toHaveBeenCalledTimes(1)
      // First arg: theme
      expect(typeof onSwitchToPray.mock.calls[0][0]).toBe('string')
      // Second arg: rich context with theme, passage reference, verse text
      const customPrompt = onSwitchToPray.mock.calls[0][1] as string
      expect(customPrompt).toContain("today's devotional about")
      expect(customPrompt).toContain('The passage is')
      expect(customPrompt).toContain('Help me pray about what I\'ve read')
      // Should NOT contain old format (which was "reflecting on [reference]. [question]")
      expect(customPrompt).not.toMatch(/reflecting on [A-Z][a-z]+ \d/)
    })

    it('Journal CTA strips "Something to think about today" prefix from reflection question', async () => {
      const onSwitchToJournal = vi.fn()
      const user = userEvent.setup()
      renderComponent('/daily?tab=devotional', { onSwitchToJournal })
      await user.click(screen.getByText(/Journal about this/))
      const customPrompt = onSwitchToJournal.mock.calls[0][1] as string
      // The stripped question should start with an uppercase letter (the actual question)
      expect(customPrompt[0]).toBe(customPrompt[0].toUpperCase())
    })
  })

  describe('Completion Tracking', () => {
    it('no completion badge for logged-out users', () => {
      renderComponent()
      expect(screen.queryByText('Completed')).not.toBeInTheDocument()
    })

    it('completion badge shows when localStorage has today and user is logged in', () => {
      mockUseAuth.mockReturnValue({
        user: { name: 'Eric', id: 'test-id' },
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
      })
      const todayStr = new Date().toLocaleDateString('en-CA')
      localStorage.setItem('wr_devotional_reads', JSON.stringify([todayStr]))
      renderComponent()
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('completion badge not shown for past days', () => {
      mockUseAuth.mockReturnValue({
        user: { name: 'Eric', id: 'test-id' },
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
      })
      const todayStr = new Date().toLocaleDateString('en-CA')
      localStorage.setItem('wr_devotional_reads', JSON.stringify([todayStr]))
      renderComponent('/daily?tab=devotional&day=-1')
      expect(screen.queryByText('Completed')).not.toBeInTheDocument()
    })
  })

  describe('Verse linking', () => {
    it('devotional passage reference is a link', () => {
      renderComponent()
      // The passage reference should be rendered as a link (via VerseLink)
      const links = screen.getAllByRole('link')
      const verseLink = links.find((l) => l.getAttribute('href')?.startsWith('/bible/'))
      expect(verseLink).toBeDefined()
    })

    it('devotional link has correct styling', () => {
      renderComponent()
      const links = screen.getAllByRole('link')
      // Find the passage VerseLink (has text-white/80), not the verse card Bible link
      const verseLink = links.find(
        (l) => l.getAttribute('href')?.startsWith('/bible/') && l.className.includes('text-white/80'),
      )
      expect(verseLink).toBeDefined()
    })
  })

  describe('Visual atmosphere', () => {
    it('wraps content in GlowBackground with glow orb', () => {
      renderComponent()
      expect(screen.getByTestId('glow-orb')).toBeInTheDocument()
    })

    it('reflection question card has frosted glass styling with purple border', () => {
      renderComponent()
      const questionText = screen.getByText(/Something to think about/)
      const card = questionText.closest('[class*="backdrop-blur"]') as HTMLElement
      expect(card).not.toBeNull()
      expect(card!.className).toContain('border-l-primary')
    })

    it('action buttons have frosted glass styling', () => {
      renderComponent()
      const shareBtn = screen.getByRole('button', { name: /Share today/i })
      expect(shareBtn.className).toContain('rounded-xl')
      expect(shareBtn.className).toContain('backdrop-blur-sm')
    })

    it('does not render BackgroundSquiggle', () => {
      const { container } = renderComponent()
      // No squiggle SVG with mask-style should be present in the component
      expect(container.querySelector('[aria-hidden="true"][style*="mask"]')).toBeNull()
    })

    it('quote section has frosted glass styling', () => {
      renderComponent()
      const blockquote = screen.getByRole('blockquote')
      const card = blockquote.closest('[class*="backdrop-blur"]') as HTMLElement
      expect(card).not.toBeNull()
      expect(card!.className).toContain('bg-white/[0.06]')
    })

    it('no section border dividers between content sections', () => {
      const { container } = renderComponent()
      // After readability fix, all border-t/border-b dividers between content sections are removed
      // FrostedCards provide visual separation instead
      const passageCallout = container.querySelector('.rounded-xl.border-l-4') as HTMLElement
      const passageSection = passageCallout!.parentElement as HTMLElement
      expect(passageSection.className).not.toContain('border-t')
      // Quote, reflection, question, pray CTA sections should have no border-t
      const blockquote = container.querySelector('blockquote') as HTMLElement
      const quoteCard = blockquote!.closest('[class*="backdrop-blur"]') as HTMLElement
      const quoteSection = quoteCard!.parentElement as HTMLElement
      expect(quoteSection.className).not.toContain('border-t')
    })

    describe('Container tiers', () => {
      it('Tier 2: passage wrapped in scripture callout with left accent', () => {
        const { container } = renderComponent()
        const callout = container.querySelector('.rounded-xl.border-l-4') as HTMLElement
        expect(callout).not.toBeNull()
        expect(callout!.className).toContain('border-l-primary/60')
        expect(callout!.className).toContain('bg-white/[0.04]')
      })

      it('Tier 2: passage text brightened to text-white', () => {
        const { container } = renderComponent()
        const callout = container.querySelector('.rounded-xl.border-l-4') as HTMLElement
        expect(callout).not.toBeNull()
        const passageP = callout!.querySelector('p') as HTMLElement
        expect(passageP).not.toBeNull()
        expect(passageP.className).toContain('text-white')
        expect(passageP.className).not.toContain('text-white/80')
      })

      it('Tier 2: verse superscripts use text-white/50 and font-medium', () => {
        const { container } = renderComponent()
        const sups = container.querySelectorAll('sup')
        expect(sups.length).toBeGreaterThan(0)
        sups.forEach((sup) => {
          expect(sup.className).toContain('text-white/50')
          expect(sup.className).toContain('font-medium')
        })
      })

      it('Tier 2: passage section outer div has no border-t', () => {
        const { container } = renderComponent()
        const callout = container.querySelector('.rounded-xl.border-l-4') as HTMLElement
        expect(callout).not.toBeNull()
        const outerDiv = callout!.parentElement as HTMLElement
        expect(outerDiv.className).not.toContain('border-t')
      })

      it('Tier 3: reflection body is wrapped in FrostedCard', () => {
        const { container } = renderComponent()
        const reflectionContent = container.querySelector('.space-y-5') as HTMLElement
        expect(reflectionContent).not.toBeNull()
        const frostedCard = reflectionContent!.closest('[class*="backdrop-blur"]') as HTMLElement
        expect(frostedCard).not.toBeNull()
        expect(frostedCard!.className).toContain('bg-white/[0.06]')
      })

      it('Tier 3: reflection FrostedCard has generous padding', () => {
        const { container } = renderComponent()
        const reflectionContent = container.querySelector('.space-y-5') as HTMLElement
        expect(reflectionContent).not.toBeNull()
        const frostedCard = reflectionContent!.closest('[class*="backdrop-blur"]') as HTMLElement
        expect(frostedCard).not.toBeNull()
        expect(frostedCard!.className).toContain('p-5')
        expect(frostedCard!.className).toContain('sm:p-8')
      })

    })

    describe('Readability enhancements', () => {
      it('glow orb uses reduced opacity (0.18)', () => {
        renderComponent()
        const glowOrb = screen.getByTestId('glow-orb')
        expect(glowOrb.getAttribute('style')).toContain('0.18')
      })

      it('passage text is not italic', () => {
        const { container } = renderComponent()
        const callout = container.querySelector('.rounded-xl.border-l-4') as HTMLElement
        const passageP = callout!.querySelector('p') as HTMLElement
        expect(passageP.className).not.toContain('italic')
      })

      it('passage text uses reading-optimized line height', () => {
        const { container } = renderComponent()
        const callout = container.querySelector('.rounded-xl.border-l-4') as HTMLElement
        const passageP = callout!.querySelector('p') as HTMLElement
        expect(passageP.className).toContain('leading-[1.75]')
      })

      it('quote blockquote has explicit line height and retains italic', () => {
        renderComponent()
        const blockquote = screen.getByRole('blockquote')
        expect(blockquote.className).toContain('leading-[1.6]')
        expect(blockquote.className).toContain('italic')
      })

      it('quote section has no border-t divider', () => {
        renderComponent()
        const blockquote = screen.getByRole('blockquote')
        const frostedCard = blockquote.closest('[class*="backdrop-blur"]') as HTMLElement
        const sectionDiv = frostedCard!.parentElement as HTMLElement
        expect(sectionDiv.className).not.toContain('border-t')
      })

      it('reflection text uses increased size and spacing', () => {
        const { container } = renderComponent()
        const reflectionContent = container.querySelector('.space-y-5') as HTMLElement
        expect(reflectionContent).not.toBeNull()
        expect(reflectionContent.className).toContain('text-[17px]')
        expect(reflectionContent.className).toContain('leading-[1.8]')
      })

      it('reflection question label uses uppercase tracked treatment', () => {
        renderComponent()
        const label = screen.getByText('Something to think about')
        expect(label.className).toContain('uppercase')
        expect(label.className).toContain('tracking-widest')
        expect(label.className).toContain('text-white/70')
        expect(label.className).toContain('font-medium')
      })

      it('question text uses larger font', () => {
        renderComponent()
        const label = screen.getByText('Something to think about')
        const questionP = label.nextElementSibling as HTMLElement
        expect(questionP).not.toBeNull()
        expect(questionP.className).toContain('text-xl')
        expect(questionP.className).toContain('leading-[1.5]')
      })

      it('quote attribution is text-white/80', () => {
        const { container } = renderComponent()
        const blockquote = container.querySelector('blockquote') as HTMLElement
        const attribution = blockquote!.nextElementSibling as HTMLElement
        expect(attribution).not.toBeNull()
        expect(attribution.className).toContain('text-white/80')
      })
    })

    it('bottom padding is compact (pb-8)', () => {
      const { container } = renderComponent()
      expect(container.querySelector('.pb-8')).not.toBeNull()
      expect(container.querySelector('.pb-16')).toBeNull()
    })
  })

  describe('Pray CTA section', () => {
    it('CTA intro text renders', () => {
      renderComponent()
      expect(screen.getByText("Ready to pray about today's reading?")).toBeInTheDocument()
    })

    it('CTA intro text has muted styling', () => {
      renderComponent()
      const intro = screen.getByText("Ready to pray about today's reading?")
      expect(intro.className).toContain('text-sm')
      expect(intro.className).toContain('text-white/60')
    })

    it('CTA button renders with correct text', () => {
      renderComponent()
      expect(screen.getByRole('button', { name: /Pray about today.*reading/ })).toBeInTheDocument()
    })

    it('CTA button has pill styling', () => {
      renderComponent()
      const btn = screen.getByRole('button', { name: /Pray about today.*reading/ })
      expect(btn.className).toContain('rounded-full')
      expect(btn.className).toContain('bg-white')
    })

    it('CTA button meets 44px touch target', () => {
      renderComponent()
      const btn = screen.getByRole('button', { name: /Pray about today.*reading/ })
      expect(btn.className).toContain('min-h-[44px]')
    })

    it('CTA section has no border-t divider', () => {
      renderComponent()
      const intro = screen.getByText("Ready to pray about today's reading?")
      const section = intro.closest('.py-6') as HTMLElement
      expect(section).not.toBeNull()
      expect(section!.className).not.toContain('border-t')
    })

    it('only one Pray CTA button exists', () => {
      renderComponent()
      const buttons = screen.getAllByRole('button', { name: /Pray about today/i })
      expect(buttons).toHaveLength(1)
    })

    it('no duplicate bottom CTA wrapper', () => {
      const { container } = renderComponent()
      // Old bottom CTA had mt-8 flex justify-center sm:mt-10
      const oldWrapper = container.querySelector('.mt-8.flex.justify-center')
      expect(oldWrapper).toBeNull()
    })
  })

  describe('Meditate on passage link', () => {
    it('renders "Meditate on this passage" link in passage section', () => {
      renderComponent()
      const meditateLink = screen.getByText('Meditate on this passage >')
      expect(meditateLink).toBeInTheDocument()
    })

    it('link has all 3 URL params from devotional passage', () => {
      renderComponent()
      const meditateLink = screen.getByText('Meditate on this passage >')
      const href = meditateLink.closest('a')!.getAttribute('href')!
      expect(href).toContain('/meditate/soaking?verse=')
      expect(href).toContain('verseText=')
      expect(href).toContain('verseTheme=')
    })

    it('link meets 44px touch target', () => {
      renderComponent()
      const meditateLink = screen.getByText('Meditate on this passage >')
      const anchor = meditateLink.closest('a')!
      expect(anchor.className).toContain('min-h-[44px]')
    })
  })

  describe('Content order', () => {
    it('quote card appears after passage section (not before)', () => {
      const { container } = renderComponent()
      const blockquote = screen.getByRole('blockquote')
      const passageCallout = container.querySelector('.rounded-xl.border-l-4') as HTMLElement
      expect(passageCallout).not.toBeNull()
      // Blockquote (in quote card) should follow passage callout in DOM
      expect(passageCallout.compareDocumentPosition(blockquote) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('reflection question appears before Pray CTA', () => {
      renderComponent()
      const questionText = screen.getByText('Something to think about')
      const prayCta = screen.getByText("Ready to pray about today's reading?")
      // Question should precede Pray CTA in DOM
      expect(questionText.compareDocumentPosition(prayCta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('full content order: date → title → passage → quote → reflection → question → pray CTA', () => {
      renderComponent()
      const dateNav = screen.getByLabelText("Previous day's devotional")
      const blockquote = screen.getByRole('blockquote')
      const questionLabel = screen.getByText('Something to think about')
      const prayCta = screen.getByText("Ready to pray about today's reading?")

      // Each should precede the next in DOM order
      expect(dateNav.compareDocumentPosition(blockquote) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(blockquote.compareDocumentPosition(questionLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(questionLabel.compareDocumentPosition(prayCta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
  })
})
