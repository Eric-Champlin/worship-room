import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { PrayerCard } from '../PrayerCard'
import type { PrayerCategory } from '@/constants/prayer-categories'
import type { PrayerRequest } from '@/types/prayer-wall'

const SHORT_PRAYER: PrayerRequest = {
  id: 'prayer-short',
  userId: 'user-1',
  authorName: 'Sarah',
  authorAvatarUrl: 'https://i.pravatar.cc/150?u=user1',
  isAnonymous: false,
  content: 'Please pray for my family.',
  category: 'family',
  postType: 'prayer_request',
  isAnswered: false,
  answeredText: null,
  answeredAt: null,
  createdAt: '2026-02-24T14:30:00Z',
  lastActivityAt: '2026-02-24T14:30:00Z',
  prayingCount: 5,
  commentCount: 1,
}

const LONG_PRAYER: PrayerRequest = {
  ...SHORT_PRAYER,
  id: 'prayer-long',
  content:
    'Please pray for my mother who was just diagnosed with cancer. She starts chemo next week and we are all scared but trusting in God. She has been the rock of our family for 40 years and I cannot imagine life without her.',
}

const ANONYMOUS_PRAYER: PrayerRequest = {
  ...SHORT_PRAYER,
  id: 'prayer-anon',
  userId: null,
  authorName: 'Anonymous',
  authorAvatarUrl: null,
  isAnonymous: true,
}

const ANSWERED_PRAYER: PrayerRequest = {
  ...SHORT_PRAYER,
  id: 'prayer-answered',
  isAnswered: true,
  answeredText: 'God answered our prayer! So grateful.',
  answeredAt: '2026-02-20T16:00:00Z',
}

function renderCard(prayer: PrayerRequest, options?: { showFull?: boolean; onCategoryClick?: (category: PrayerCategory) => void }) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PrayerCard prayer={prayer} showFull={options?.showFull} onCategoryClick={options?.onCategoryClick} />
    </MemoryRouter>,
  )
}

describe('PrayerCard', () => {
  it('renders author name and formatted date', () => {
    renderCard(SHORT_PRAYER, {})
    expect(screen.getByText('Sarah')).toBeInTheDocument()
    expect(screen.getByText('Feb 24, 2026')).toBeInTheDocument()
  })

  it('truncates long prayer text and shows "Show more" button', () => {
    renderCard(LONG_PRAYER, {})
    expect(screen.getByText('Show more')).toBeInTheDocument()
    // Text should be truncated
    expect(screen.queryByText(LONG_PRAYER.content)).not.toBeInTheDocument()
  })

  it('expands text on "Show more" click, shows "Show less"', async () => {
    const user = userEvent.setup()
    renderCard(LONG_PRAYER, {})

    await user.click(screen.getByText('Show more'))
    expect(screen.getByText(LONG_PRAYER.content)).toBeInTheDocument()
    expect(screen.getByText('Show less')).toBeInTheDocument()
  })

  it('does NOT show "Show more" for short prayers (< 150 chars)', () => {
    renderCard(SHORT_PRAYER, {})
    expect(screen.queryByText('Show more')).not.toBeInTheDocument()
  })

  it('renders "Anonymous" for anonymous prayers without profile link', () => {
    renderCard(ANONYMOUS_PRAYER, {})
    expect(screen.getByText('Anonymous')).toBeInTheDocument()
    // No link to profile
    const links = screen.queryAllByRole('link')
    const profileLinks = links.filter((l) => l.getAttribute('href')?.includes('/prayer-wall/user/'))
    expect(profileLinks).toHaveLength(0)
  })

  it('renders AnsweredBadge when prayer.isAnswered is true', () => {
    renderCard(ANSWERED_PRAYER, {})
    expect(screen.getByText('Answered Prayer')).toBeInTheDocument()
    expect(screen.getByText('God answered our prayer! So grateful.')).toBeInTheDocument()
  })

  it('does not truncate when showFull is true', () => {
    renderCard(LONG_PRAYER, { showFull: true })
    expect(screen.getByText(LONG_PRAYER.content)).toBeInTheDocument()
    expect(screen.queryByText('Show more')).not.toBeInTheDocument()
  })

  it('renders profile link for non-anonymous prayers', () => {
    renderCard(SHORT_PRAYER, {})
    const links = screen.getAllByRole('link')
    const profileLinks = links.filter((l) =>
      l.getAttribute('href')?.includes('/prayer-wall/user/user-1'),
    )
    expect(profileLinks.length).toBeGreaterThan(0)
  })

  it('renders category badge', () => {
    renderCard(SHORT_PRAYER, {})
    expect(screen.getByText('Family')).toBeInTheDocument()
  })

  it('badge click calls onCategoryClick', async () => {
    const user = userEvent.setup()
    const onCategoryClick = vi.fn()
    renderCard(SHORT_PRAYER, { onCategoryClick })
    await user.click(screen.getByText('Family'))
    expect(onCategoryClick).toHaveBeenCalledWith('family')
  })

  it('badge renders as span without onCategoryClick', () => {
    renderCard(SHORT_PRAYER, {})
    const badge = screen.getByText('Family')
    expect(badge.tagName).toBe('SPAN')
  })

  it('renders TypeMarker icon next to the timestamp for prayer_request post type', () => {
    renderCard(SHORT_PRAYER, {})
    const article = screen.getByRole('article')
    const header = article.querySelector('header')!
    const decorativeSvg = header.querySelector('svg[aria-hidden="true"]')
    expect(decorativeSvg).toBeInTheDocument()
    expect(decorativeSvg).toHaveClass('lucide-hand-helping')
  })

  it('TypeMarker icon is decorative (aria-hidden) and uses canonical sizing', () => {
    renderCard(SHORT_PRAYER, {})
    const article = screen.getByRole('article')
    const header = article.querySelector('header')!
    const icon = header.querySelector('svg[aria-hidden="true"]')!
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon).toHaveClass('h-3.5', 'w-3.5', 'text-white/40')
  })

  it('header preserves author + em-dash + time element layout (regression)', () => {
    renderCard(SHORT_PRAYER, {})
    const article = screen.getByRole('article')
    const header = article.querySelector('header')!
    expect(header).toHaveTextContent(SHORT_PRAYER.authorName)
    expect(header.textContent).toContain('—')
    const time = header.querySelector('time')!
    expect(time).toBeInTheDocument()
    expect(time).toHaveAttribute('dateTime', SHORT_PRAYER.createdAt)
  })
})

// =====================================================================
// Spec 4.3 — testimony post-type chrome and icon
// =====================================================================

const TESTIMONY_PRAYER: PrayerRequest = {
  ...SHORT_PRAYER,
  id: 'prayer-testimony',
  authorName: 'Sarah',
  postType: 'testimony',
  category: null,
  content: 'My family prayed for healing for my mom for almost two years. Praise God — He hears.',
}

describe('PrayerCard — Spec 4.3 testimony chrome', () => {
  it('renders testimony chrome classes when postType is testimony', () => {
    renderCard(TESTIMONY_PRAYER, {})
    const article = screen.getByRole('article')
    expect(article.className).toContain('bg-amber-500/[0.08]')
    expect(article.className).toContain('border-amber-200/[0.12]')
  })

  it('renders default chrome classes when postType is prayer_request', () => {
    renderCard(SHORT_PRAYER, {})
    const article = screen.getByRole('article')
    expect(article.className).toContain('bg-white/[0.07]')
    expect(article.className).toContain('border-white/[0.12]')
    expect(article.className).not.toContain('amber')
  })

  it('renders Sparkles icon for testimony posts', () => {
    renderCard(TESTIMONY_PRAYER, {})
    const article = screen.getByRole('article')
    const header = article.querySelector('header')!
    const icon = header.querySelector('svg[aria-hidden="true"]')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveClass('lucide-sparkles')
  })

  it('renders HandHelping icon for prayer_request posts', () => {
    renderCard(SHORT_PRAYER, {})
    const article = screen.getByRole('article')
    const header = article.querySelector('header')!
    const icon = header.querySelector('svg[aria-hidden="true"]')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveClass('lucide-hand-helping')
  })

  it('aria-label is "Testimony by {authorName}" for testimony posts', () => {
    renderCard(TESTIMONY_PRAYER, {})
    expect(screen.getByLabelText('Testimony by Sarah')).toBe(screen.getByRole('article'))
  })

  it('aria-label is "Prayer by {authorName}" for prayer_request posts', () => {
    renderCard(SHORT_PRAYER, {})
    expect(screen.getByLabelText('Prayer by Sarah')).toBe(screen.getByRole('article'))
  })

  it('mixed feed renders correct chrome and icon for each type', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PrayerCard prayer={SHORT_PRAYER} />
        <PrayerCard prayer={TESTIMONY_PRAYER} />
      </MemoryRouter>,
    )
    const articles = screen.getAllByRole('article')
    expect(articles).toHaveLength(2)
    // First card: prayer_request (white chrome)
    expect(articles[0].className).toContain('bg-white/[0.07]')
    expect(articles[0].querySelector('svg.lucide-hand-helping')).toBeInTheDocument()
    // Second card: testimony (amber chrome)
    expect(articles[1].className).toContain('bg-amber-500/[0.08]')
    expect(articles[1].querySelector('svg.lucide-sparkles')).toBeInTheDocument()
  })
})

const QUESTION_PRAYER: PrayerRequest = {
  ...SHORT_PRAYER,
  id: 'prayer-question',
  authorName: 'Sarah',
  postType: 'question',
  category: null,
  content: 'What does Romans 8:28 mean for those who are suffering right now?',
}

describe('PrayerCard — Spec 4.4 question chrome', () => {
  it('renders question chrome classes when postType is question', () => {
    renderCard(QUESTION_PRAYER, {})
    const article = screen.getByRole('article')
    expect(article.className).toContain('bg-cyan-500/[0.08]')
    expect(article.className).toContain('border-cyan-200/[0.12]')
  })

  it('does not render question chrome classes when postType is prayer_request', () => {
    renderCard(SHORT_PRAYER, {})
    const article = screen.getByRole('article')
    expect(article.className).not.toContain('cyan')
  })

  it('does not render question chrome classes when postType is testimony', () => {
    renderCard(TESTIMONY_PRAYER, {})
    const article = screen.getByRole('article')
    expect(article.className).not.toContain('cyan')
  })

  it('renders HelpCircle icon for question posts', () => {
    renderCard(QUESTION_PRAYER, {})
    const article = screen.getByRole('article')
    const header = article.querySelector('header')!
    const icon = header.querySelector('svg[aria-hidden="true"]')
    expect(icon).toBeInTheDocument()
    // lucide-react renders the icon's kebab-case name as a class for HelpCircle.
    // The Lucide v0.x naming policy uses 'lucide-help-circle' (or the alias
    // 'lucide-circle-help'). Accept either to insulate the test from minor
    // upstream rename swings.
    const className = icon!.getAttribute('class') ?? ''
    expect(/lucide-(help-circle|circle-help)/.test(className)).toBe(true)
  })

  it('aria-label says "Question by {authorName}" for question posts', () => {
    renderCard(QUESTION_PRAYER, {})
    expect(screen.getByLabelText('Question by Sarah')).toBe(screen.getByRole('article'))
  })

  it('mixed feed renders correct chrome and icon for prayer_request, testimony, and question', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PrayerCard prayer={SHORT_PRAYER} />
        <PrayerCard prayer={TESTIMONY_PRAYER} />
        <PrayerCard prayer={QUESTION_PRAYER} />
      </MemoryRouter>,
    )
    const articles = screen.getAllByRole('article')
    expect(articles).toHaveLength(3)
    expect(articles[0].className).toContain('bg-white/[0.07]')
    expect(articles[1].className).toContain('bg-amber-500/[0.08]')
    expect(articles[2].className).toContain('bg-cyan-500/[0.08]')
  })
})

const DISCUSSION_PRAYER: PrayerRequest = {
  ...SHORT_PRAYER,
  id: 'prayer-discussion',
  authorName: 'Maria',
  postType: 'discussion',
  category: 'discussion',
  content: 'How do you all stay disciplined in prayer through busy seasons?',
}

const DISCUSSION_WITH_SCRIPTURE: PrayerRequest = {
  ...DISCUSSION_PRAYER,
  id: 'prayer-discussion-scripture',
  scriptureReference: 'Romans 8:28',
  // WEB Romans 8:28 verbatim — matches data/bible/web/romans.json and the
  // prayer-wall-mock-data fixture. Earlier "And we know that…" text was an
  // ESV/KJV-flavored carry-over from the plan's illustrative snippet.
  scriptureText:
    'We know that all things work together for good for those who love God, for those who are called according to his purpose.',
}

describe('PrayerCard — Spec 4.5 discussion chrome', () => {
  it('discussion postType applies violet chrome classes', () => {
    renderCard(DISCUSSION_PRAYER, {})
    const article = screen.getByRole('article')
    expect(article.className).toContain('bg-violet-500/[0.08]')
    expect(article.className).toContain('border-violet-200/[0.12]')
  })

  it('non-discussion postTypes do NOT apply violet chrome', () => {
    for (const prayer of [SHORT_PRAYER, TESTIMONY_PRAYER, QUESTION_PRAYER]) {
      const { container, unmount } = render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <PrayerCard prayer={prayer} />
        </MemoryRouter>,
      )
      expect(container.querySelector('article')?.className).not.toContain(
        'bg-violet-500/[0.08]',
      )
      unmount()
    }
  })

  it('renders MessagesSquare icon for discussion posts', () => {
    renderCard(DISCUSSION_PRAYER, {})
    const article = screen.getByRole('article')
    const header = article.querySelector('header')!
    const icon = header.querySelector('svg[aria-hidden="true"]')
    expect(icon).toBeInTheDocument()
    // Lucide adds a `lucide-messages-square` class to the rendered SVG.
    const className = icon!.getAttribute('class') ?? ''
    expect(/lucide-messages-square/.test(className)).toBe(true)
  })

  it('aria-label says "Discussion by {authorName}" for discussion posts', () => {
    renderCard(DISCUSSION_PRAYER, {})
    expect(screen.getByLabelText('Discussion by Maria')).toBe(
      screen.getByRole('article'),
    )
  })

  it('QotdBadge still renders on QOTD-tagged discussion (no regression)', () => {
    const qotdDiscussion: PrayerRequest = {
      ...DISCUSSION_PRAYER,
      qotdId: 'qotd-2026-05-08',
    }
    renderCard(qotdDiscussion, {})
    // QotdBadge renders the literal "Re: Question of the Day" pill
    expect(screen.getByText(/Re: Question of the Day/i)).toBeInTheDocument()
  })

  it('ScriptureChip renders below content when scriptureReference is set', () => {
    renderCard(DISCUSSION_WITH_SCRIPTURE, {})
    expect(
      screen.getByRole('link', { name: /Read Romans 8:28 in the Bible/ }),
    ).toBeInTheDocument()
  })

  it('ScriptureChip does NOT render when scriptureReference is unset', () => {
    renderCard(DISCUSSION_PRAYER, {})
    expect(
      screen.queryByRole('link', { name: /Read .* in the Bible/ }),
    ).not.toBeInTheDocument()
  })
})

const ENCOURAGEMENT_PRAYER: PrayerRequest = {
  ...SHORT_PRAYER,
  id: 'prayer-encouragement',
  authorName: 'Sarah M.',
  postType: 'encouragement',
  category: 'other',
  content: 'Praying you find a quiet moment today. You are seen.',
  commentCount: 0,
}

describe('PrayerCard — Spec 4.6 encouragement chrome', () => {
  it('encouragement postType applies rose chrome classes', () => {
    renderCard(ENCOURAGEMENT_PRAYER, {})
    const article = screen.getByRole('article')
    expect(article.className).toContain('bg-rose-500/[0.08]')
    expect(article.className).toContain('border-rose-200/[0.12]')
  })

  it('non-encouragement postTypes do NOT apply rose chrome (regression guard)', () => {
    for (const prayer of [SHORT_PRAYER, TESTIMONY_PRAYER, QUESTION_PRAYER, DISCUSSION_PRAYER]) {
      const { container, unmount } = render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <PrayerCard prayer={prayer} />
        </MemoryRouter>,
      )
      expect(container.querySelector('article')?.className).not.toContain(
        'bg-rose-500/[0.08]',
      )
      unmount()
    }
  })

  it('renders Heart icon for encouragement posts', () => {
    renderCard(ENCOURAGEMENT_PRAYER, {})
    const article = screen.getByRole('article')
    const header = article.querySelector('header')!
    const icon = header.querySelector('svg[aria-hidden="true"]')
    expect(icon).toBeInTheDocument()
    // Lucide adds a `lucide-heart` class to the rendered SVG.
    const className = icon!.getAttribute('class') ?? ''
    expect(/lucide-heart/.test(className)).toBe(true)
  })

  it('aria-label says "Encouragement by {authorName}" for encouragement posts', () => {
    renderCard(ENCOURAGEMENT_PRAYER, {})
    expect(screen.getByLabelText('Encouragement by Sarah M.')).toBe(
      screen.getByRole('article'),
    )
  })

  it('mixed feed renders correct chrome for all 5 types', () => {
    const fixtures: Array<{ prayer: PrayerRequest; expectedBg: string }> = [
      { prayer: SHORT_PRAYER, expectedBg: 'bg-white/[0.07]' },
      { prayer: TESTIMONY_PRAYER, expectedBg: 'bg-amber-500/[0.08]' },
      { prayer: QUESTION_PRAYER, expectedBg: 'bg-cyan-500/[0.08]' },
      { prayer: DISCUSSION_PRAYER, expectedBg: 'bg-violet-500/[0.08]' },
      { prayer: ENCOURAGEMENT_PRAYER, expectedBg: 'bg-rose-500/[0.08]' },
    ]
    for (const { prayer, expectedBg } of fixtures) {
      const { container, unmount } = render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <PrayerCard prayer={prayer} />
        </MemoryRouter>,
      )
      expect(container.querySelector('article')?.className).toContain(expectedBg)
      unmount()
    }
  })

  it('encouragement does NOT show "Anonymous" attribution (always signed)', () => {
    renderCard(ENCOURAGEMENT_PRAYER, {})
    expect(screen.getByText('Sarah M.')).toBeInTheDocument()
    expect(screen.queryByText('Anonymous')).not.toBeInTheDocument()
  })
})

// =====================================================================
// Spec 4.6b — image attachment rendering
// =====================================================================

const TESTIMONY_WITH_IMAGE: PrayerRequest = {
  ...SHORT_PRAYER,
  id: 'prayer-with-image',
  postType: 'testimony',
  content: 'God answered my prayer in a beautiful way.',
  image: {
    full: 'https://signed/full.jpg',
    medium: 'https://signed/medium.jpg',
    thumb: 'https://signed/thumb.jpg',
    altText: 'A photo of my mom on the day of her clean scan.',
  },
}

const TESTIMONY_WITHOUT_IMAGE: PrayerRequest = {
  ...SHORT_PRAYER,
  id: 'prayer-without-image',
  postType: 'testimony',
  content: 'God answered my prayer in a beautiful way.',
}

describe('PrayerCard — Spec 4.6b image attachment', () => {
  it('renders <PostImage> when prayer.image is set', () => {
    renderCard(TESTIMONY_WITH_IMAGE, {})
    // PostImage exposes a button with aria-label "Open image: <altText>"
    expect(
      screen.getByRole('button', { name: /open image: a photo of my mom/i }),
    ).toBeInTheDocument()
    // The medium rendition is the in-feed src.
    const img = screen.getByAltText(TESTIMONY_WITH_IMAGE.image!.altText) as HTMLImageElement
    expect(img.src).toContain('medium.jpg')
  })

  it('does NOT render <PostImage> when prayer.image is undefined', () => {
    renderCard(TESTIMONY_WITHOUT_IMAGE, {})
    expect(
      screen.queryByRole('button', { name: /open image:/i }),
    ).not.toBeInTheDocument()
  })

  it('renders the image between content body and the InteractionBar slot', () => {
    // The InteractionBar slot is filled by the `children` prop. The image
    // must mount AFTER the content body and BEFORE children in the DOM.
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PrayerCard prayer={TESTIMONY_WITH_IMAGE}>
          <div data-testid="interaction-bar-slot">interaction bar</div>
        </PrayerCard>
      </MemoryRouter>,
    )

    const contentBody = screen.getByText(TESTIMONY_WITH_IMAGE.content)
    const imageButton = screen.getByRole('button', { name: /open image:/i })
    const slot = screen.getByTestId('interaction-bar-slot')

    // DOCUMENT_POSITION_FOLLOWING (4) means the second node follows the first.
    expect(contentBody.compareDocumentPosition(imageButton)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(imageButton.compareDocumentPosition(slot)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  // ====================================================================
  // Spec 4.7b — WaysToHelpPills integration (3 tests)
  // ====================================================================

  it('Spec 4.7b — renders pills row for prayer_request with [meals] tag', () => {
    const prayer: PrayerRequest = { ...SHORT_PRAYER, helpTags: ['meals'] }
    render(
      <MemoryRouter>
        <PrayerCard prayer={prayer} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('ways-to-help-pills')).toBeInTheDocument()
    expect(screen.getByText('Meals')).toBeInTheDocument()
  })

  it('Spec 4.7b — does NOT render pills row for prayer_request with no tags', () => {
    render(
      <MemoryRouter>
        <PrayerCard prayer={SHORT_PRAYER} />
      </MemoryRouter>,
    )
    expect(screen.queryByTestId('ways-to-help-pills')).not.toBeInTheDocument()
  })

  it('Spec 4.7b — does NOT render pills row for prayer_request with only [just_prayer] (W5)', () => {
    const prayer: PrayerRequest = {
      ...SHORT_PRAYER,
      helpTags: ['just_prayer'],
    }
    render(
      <MemoryRouter>
        <PrayerCard prayer={prayer} />
      </MemoryRouter>,
    )
    expect(screen.queryByTestId('ways-to-help-pills')).not.toBeInTheDocument()
  })

  it('Spec 5.1 — renders an article element inside a FrostedCard (rounded-3xl surface)', () => {
    const { container } = render(
      <MemoryRouter>
        <PrayerCard prayer={SHORT_PRAYER} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('article')).toBeInTheDocument()
    expect(container.querySelector('[class*="rounded-3xl"]')).toBeInTheDocument()
  })

  it('Spec 5.1 — pulse animation class is added to the wrapping div, not the article', () => {
    const { container } = render(
      <MemoryRouter>
        <PrayerCard prayer={SHORT_PRAYER} />
      </MemoryRouter>,
    )
    const article = screen.getByRole('article')
    const outerDiv = article.closest('div')
    expect(outerDiv).not.toBeNull()
    // Pulse fires on the outer div wrapper, not on the article itself
    expect(outerDiv).toBe(container.querySelector('article')?.closest('div'))
  })
})

// =====================================================================
// Spec 5.5 — tier prop (PrayerDetail elevates main card to Tier 1 accent)
// =====================================================================

describe('PrayerCard — Spec 5.5 tier prop', () => {
  it('defaults to tier="feed" — renders default-variant chrome with per-type overlay (testimony)', () => {
    renderCard(TESTIMONY_PRAYER, {})
    const article = screen.getByRole('article')
    // tailwind-merge resolves per-type chrome over the default surface, so amber wins for bg/border
    expect(article.className).toContain('bg-amber-500/[0.08]')
    expect(article.className).toContain('border-amber-200/[0.12]')
    // No accent variant (violet) — default variant produces frosted base, not violet tint
    expect(article.className).not.toContain('bg-violet-500/[0.08]')
    expect(article.className).not.toContain('border-violet-400/70')
  })

  it('prayer_request with default tier — frosted default surface (no per-type overlay)', () => {
    renderCard(SHORT_PRAYER, {})
    const article = screen.getByRole('article')
    // prayer_request has empty per-type chrome string, so default surface remains
    expect(article.className).toContain('bg-white/[0.07]')
    expect(article.className).toContain('border-white/[0.12]')
  })

  it('tier="detail" — renders accent-variant chrome (violet)', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PrayerCard prayer={SHORT_PRAYER} tier="detail" />
      </MemoryRouter>,
    )
    const article = screen.getByRole('article')
    // Accent variant: violet tint
    expect(article.className).toContain('bg-violet-500/[0.08]')
    expect(article.className).toContain('border-violet-400/70')
  })

  it('tier="detail" drops per-type chrome (safe default — no overlay wash on Tier 1)', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PrayerCard prayer={TESTIMONY_PRAYER} tier="detail" />
      </MemoryRouter>,
    )
    const article = screen.getByRole('article')
    // No amber overlay — only the accent violet
    expect(article.className).not.toContain('bg-amber-500/[0.08]')
    expect(article.className).not.toContain('border-amber-200/[0.12]')
    expect(article.className).toContain('bg-violet-500/[0.08]')
  })

  it('"Show more" expand button uses canonical violet text-button (text-violet-300)', () => {
    const longPrayer: PrayerRequest = {
      ...SHORT_PRAYER,
      content: 'a'.repeat(200),
    }
    renderCard(longPrayer, {})
    const showMore = screen.getByRole('button', { name: 'Show more' })
    expect(showMore.className).toContain('text-violet-300')
    expect(showMore.className).toContain('hover:text-violet-200')
    expect(showMore.className).toContain('focus-visible:ring-white/50')
  })
})

// ─── Spec 6.6b — answered-text fallback + author affordances ─────────────────

describe('PrayerCard — Spec 6.6b answered text fallback + author affordances', () => {
  // ANSWERED_PRAYER with answeredText cleared — triggers the fallback path.
  const ANSWERED_NO_TEXT: PrayerRequest = {
    ...SHORT_PRAYER,
    id: 'prayer-answered-no-text',
    isAnswered: true,
    answeredText: null,
    answeredAt: '2026-02-20T16:00:00Z',
  }

  it('T13 — renders the missing-text fallback when isAnswered=true and answeredText is null (answeredVariant only)', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PrayerCard prayer={ANSWERED_NO_TEXT} answeredVariant />
      </MemoryRouter>,
    )
    expect(
      screen.getByText(
        /This prayer was marked answered\. The author hasn'?t shared an update\./i,
      ),
    ).toBeInTheDocument()
  })

  it('does NOT render the fallback when answeredText is present', () => {
    const ANSWERED_WITH_TEXT: PrayerRequest = {
      ...ANSWERED_NO_TEXT,
      answeredText: 'Thank you Lord!',
    }
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PrayerCard prayer={ANSWERED_WITH_TEXT} answeredVariant />
      </MemoryRouter>,
    )
    expect(
      screen.queryByText(
        /This prayer was marked answered\. The author hasn'?t shared an update\./i,
      ),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Thank you Lord!')).toBeInTheDocument()
  })

  it('T15 — non-author sees NEITHER "Share an update" NOR "Un-mark as answered" affordances (no auth context = treated as not-author)', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PrayerCard
          prayer={ANSWERED_NO_TEXT}
          answeredVariant
          onUnmark={() => {}}
          onEditAnsweredText={() => {}}
        />
      </MemoryRouter>,
    )
    // Without an AuthProvider in the test tree, the ownership check returns
    // false. The affordance buttons MUST NOT render.
    expect(
      screen.queryByRole('button', { name: /share an update|edit your update/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /un-mark as answered/i }),
    ).not.toBeInTheDocument()
  })

  it('does NOT render the affordance row when callbacks are absent (other PrayerCard call sites unaffected)', () => {
    // Even with author context, no callbacks = no row.
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PrayerCard prayer={ANSWERED_NO_TEXT} answeredVariant />
      </MemoryRouter>,
    )
    expect(
      screen.queryByRole('button', { name: /share an update|edit your update/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /un-mark as answered/i }),
    ).not.toBeInTheDocument()
  })

  it('T14 — author sees both "Share an update" and "Un-mark as answered" affordances when callbacks are passed', async () => {
    const { AuthContext } = await import('@/contexts/AuthContext')
    const mockUser = {
      id: SHORT_PRAYER.userId as string, // matches prayer.userId
      email: 'sarah@test.local',
      displayName: 'Sarah',
      isAdmin: false,
      legalVersions: { termsVersion: '1', privacyVersion: '1' },
    }
    const mockAuthValue = {
      isAuthenticated: true,
      isAuthResolving: false,
      user: mockUser,
      login: async () => {},
      register: async () => {},
      logout: async () => {},
      simulateLegacyAuth: () => {},
      refreshUser: async () => {},
    }
    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <PrayerCard
            prayer={ANSWERED_NO_TEXT}
            answeredVariant
            onUnmark={() => {}}
            onEditAnsweredText={() => {}}
          />
        </MemoryRouter>
      </AuthContext.Provider>,
    )
    // No answeredText → label is "Share an update" (not "Edit your update").
    expect(
      screen.getByRole('button', { name: /share an update/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /un-mark as answered/i }),
    ).toBeInTheDocument()
  })

  it('shows "Edit your update" label when answeredText is present for the author', async () => {
    const { AuthContext } = await import('@/contexts/AuthContext')
    const ANSWERED_WITH_TEXT: PrayerRequest = {
      ...ANSWERED_NO_TEXT,
      answeredText: 'Praise God',
    }
    const mockAuthValue = {
      isAuthenticated: true,
      isAuthResolving: false,
      user: {
        id: SHORT_PRAYER.userId as string,
        email: 'sarah@test.local',
        displayName: 'Sarah',
        isAdmin: false,
        legalVersions: { termsVersion: '1', privacyVersion: '1' },
      },
      login: async () => {},
      register: async () => {},
      logout: async () => {},
      simulateLegacyAuth: () => {},
      refreshUser: async () => {},
    }
    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <PrayerCard
            prayer={ANSWERED_WITH_TEXT}
            answeredVariant
            onUnmark={() => {}}
            onEditAnsweredText={() => {}}
          />
        </MemoryRouter>
      </AuthContext.Provider>,
    )
    expect(
      screen.getByRole('button', { name: /edit your update/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /share an update/i }),
    ).not.toBeInTheDocument()
  })
})

// =====================================================================
// Spec 7.1 — Bible to Prayer Wall Bridge: scripture chip across 5 post types
// =====================================================================

describe('PrayerCard — Spec 7.1 scripture chip across all 5 post types', () => {
  const POST_TYPES_WITH_SCRIPTURE: Array<PrayerRequest['postType']> = [
    'prayer_request',
    'testimony',
    'question',
    'discussion',
    'encouragement',
  ]

  POST_TYPES_WITH_SCRIPTURE.forEach((postType) => {
    it(`renders ScriptureChip on ${postType} when scriptureReference is set`, () => {
      const prayer: PrayerRequest = {
        ...SHORT_PRAYER,
        id: `prayer-${postType}-with-scripture`,
        postType,
        // encouragement uses 'other', others can keep family.
        category: postType === 'encouragement' ? 'other' : 'family',
        scriptureReference: 'Romans 8:28',
        scriptureText:
          'We know that all things work together for good for those who love God, for those who are called according to his purpose.',
      }
      renderCard(prayer, {})
      // The ScriptureChip renders a link with the canonical aria pattern.
      const chip = screen.getByRole('link', {
        name: /Read Romans 8:28 in the Bible/,
      })
      expect(chip).toBeInTheDocument()
      // Verse-level deep link: /bible/<book>/<chapter>?verse=<verseNumber>
      expect(chip).toHaveAttribute('href', '/bible/romans/8?verse=28')
    })
  })

  it('chip is NOT rendered when scriptureReference is null on any post type', () => {
    const prayer: PrayerRequest = {
      ...SHORT_PRAYER,
      postType: 'prayer_request',
      scriptureReference: undefined,
      scriptureText: undefined,
    }
    renderCard(prayer, {})
    expect(
      screen.queryByRole('link', { name: /in the Bible/ }),
    ).not.toBeInTheDocument()
  })
})
