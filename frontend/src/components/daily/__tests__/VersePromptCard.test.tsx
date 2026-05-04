import { render, screen, fireEvent } from '@testing-library/react'
import { VersePromptCard, VersePromptSkeleton } from '../VersePromptCard'
import type { VerseContext } from '@/types/daily-experience'

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

import { useReducedMotion } from '@/hooks/useReducedMotion'

const singleVerseContext: VerseContext = {
  book: 'john',
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
  verses: [
    {
      number: 16,
      text: 'For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.',
    },
  ],
  reference: 'John 3:16',
  source: 'bible',
}

const multiVerseContext: VerseContext = {
  book: 'john',
  chapter: 3,
  startVerse: 16,
  endVerse: 18,
  verses: [
    {
      number: 16,
      text: 'For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.',
    },
    {
      number: 17,
      text: "For God didn't send his Son into the world to judge the world, but that the world should be saved through him.",
    },
    {
      number: 18,
      text: 'He who believes in him is not judged. He who doesn\'t believe has been judged already, because he has not believed in the name of the only born Son of God.',
    },
  ],
  reference: 'John 3:16\u201318',
  source: 'bible',
}

const noop = vi.fn()

describe('VersePromptCard', () => {
  beforeEach(() => {
    noop.mockClear()
    vi.mocked(useReducedMotion).mockReturnValue(false)
  })

  it('renders verse reference', () => {
    render(<VersePromptCard context={singleVerseContext} onRemove={noop} framingLine="What do you want to say to God about this?" />)
    expect(screen.getByText('John 3:16')).toBeInTheDocument()
  })

  it('renders single verse text without verse number superscript', () => {
    render(<VersePromptCard context={singleVerseContext} onRemove={noop} framingLine="What do you want to say to God about this?" />)
    expect(
      screen.getByText(
        /For God so loved the world, that he gave his only born Son/,
      ),
    ).toBeInTheDocument()
    // Single verse should not show a superscript number
    expect(screen.queryByText('16')).not.toBeInTheDocument()
  })

  it('renders multi-verse with superscript numbers', () => {
    render(<VersePromptCard context={multiVerseContext} onRemove={noop} framingLine="What do you want to say to God about this?" />)
    const sup16 = screen.getByText('16')
    const sup17 = screen.getByText('17')
    const sup18 = screen.getByText('18')
    expect(sup16.tagName).toBe('SUP')
    expect(sup17.tagName).toBe('SUP')
    expect(sup18.tagName).toBe('SUP')
  })

  it('renders framing line', () => {
    render(<VersePromptCard context={singleVerseContext} onRemove={noop} framingLine="What do you want to say to God about this?" />)
    expect(
      screen.getByText('What do you want to say to God about this?'),
    ).toBeInTheDocument()
  })

  it('X button has aria-label', () => {
    render(<VersePromptCard context={singleVerseContext} onRemove={noop} framingLine="What do you want to say to God about this?" />)
    expect(
      screen.getByRole('button', { name: 'Remove verse prompt' }),
    ).toBeInTheDocument()
  })

  it('X button has 44px tap target via h-11 w-11 (44px)', () => {
    render(<VersePromptCard context={singleVerseContext} onRemove={noop} framingLine="What do you want to say to God about this?" />)
    const button = screen.getByRole('button', { name: 'Remove verse prompt' })
    expect(button.className).toContain('h-11')
    expect(button.className).toContain('w-11')
  })

  it('X button is rendered via Button ghost variant', () => {
    render(<VersePromptCard context={singleVerseContext} onRemove={noop} framingLine="What do you want to say to God about this?" />)
    const button = screen.getByRole('button', { name: 'Remove verse prompt' })
    // Ghost variant text classes from Button.tsx:57
    expect(button.className).toContain('text-white/80')
    expect(button.className).toContain('hover:text-white')
    expect(button.className).toContain('hover:bg-white/5')
  })

  it('outer container has canonical Tier 2 padding', () => {
    render(<VersePromptCard context={singleVerseContext} onRemove={noop} framingLine="What do you want to say to God about this?" />)
    const region = screen.getByRole('region')
    expect(region.className).toContain('px-5')
    expect(region.className).toContain('py-6')
    expect(region.className).toContain('sm:px-7')
    expect(region.className).toContain('sm:py-7')
  })

  it('skeleton has matching Tier 2 padding', () => {
    render(<VersePromptSkeleton />)
    const skeleton = document.querySelector('[aria-hidden="true"]') as HTMLElement
    expect(skeleton.className).toContain('px-5')
    expect(skeleton.className).toContain('py-6')
    expect(skeleton.className).toContain('sm:px-7')
    expect(skeleton.className).toContain('sm:py-7')
  })

  it('X button calls onRemove', () => {
    render(<VersePromptCard context={singleVerseContext} onRemove={noop} framingLine="What do you want to say to God about this?" />)
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove verse prompt' }),
    )
    expect(noop).toHaveBeenCalledTimes(1)
  })

  it('card has accessible region', () => {
    render(<VersePromptCard context={singleVerseContext} onRemove={noop} framingLine="What do you want to say to God about this?" />)
    const region = screen.getByRole('region')
    expect(region).toHaveAttribute(
      'aria-label',
      'Verse prompt: John 3:16',
    )
  })

  it('skeleton renders with aria-hidden', () => {
    render(<VersePromptSkeleton />)
    const skeleton = document.querySelector('[aria-hidden="true"]')
    expect(skeleton).toBeInTheDocument()
  })

  it('respects prefers-reduced-motion', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    render(<VersePromptCard context={singleVerseContext} onRemove={noop} framingLine="What do you want to say to God about this?" />)
    const region = screen.getByRole('region')
    expect(region.className).not.toContain('animate-fade-in')
  })

  it('renders custom framing line', () => {
    render(<VersePromptCard context={singleVerseContext} onRemove={noop} framingLine="What comes up as you sit with this?" />)
    expect(
      screen.getByText('What comes up as you sit with this?'),
    ).toBeInTheDocument()
  })
})
