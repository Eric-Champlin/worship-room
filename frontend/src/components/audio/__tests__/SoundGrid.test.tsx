import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SoundGrid } from '../SoundGrid'

const EMPTY_SET = new Set<string>()

function renderGrid(overrides?: {
  activeSoundIds?: Set<string>
  loadingSoundIds?: Set<string>
  errorSoundIds?: Set<string>
}) {
  return render(
    <SoundGrid
      activeSoundIds={overrides?.activeSoundIds ?? EMPTY_SET}
      loadingSoundIds={overrides?.loadingSoundIds ?? EMPTY_SET}
      errorSoundIds={overrides?.errorSoundIds ?? EMPTY_SET}
      onToggle={() => {}}
    />,
  )
}

describe('SoundGrid', () => {
  it('renders all 4 category SectionHeaders', () => {
    renderGrid()
    expect(screen.getByRole('heading', { level: 3, name: /nature/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: /environments/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: /spiritual/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: /instruments/i })).toBeInTheDocument()
  })

  it('each category heading uses the canonical uppercase white style (Round 2: full white)', () => {
    renderGrid()
    for (const name of ['Nature', 'Environments', 'Spiritual', 'Instruments']) {
      const heading = screen.getByRole('heading', { level: 3, name })
      expect(heading.className).toContain('uppercase')
      expect(heading.className).toContain('tracking-wide')
      expect(heading.className).toContain('text-white')
      expect(heading.className).not.toContain('text-white/50')
    }
  })

  it('wraps each category in a ScrollRow region with an aria-label', () => {
    renderGrid()
    // ScrollRow region has an aria-label attribute (distinct from the section's aria-labelledby).
    for (const label of ['Nature', 'Environments', 'Spiritual', 'Instruments']) {
      const scrollRow = document.querySelector(
        `[role="region"][aria-label="${label}"]`,
      )
      expect(scrollRow).toBeInTheDocument()
    }
  })

  it('renders one SoundCard per catalog sound (24 total)', () => {
    renderGrid()
    const buttons = screen.getAllByRole('button').filter((el) =>
      el.hasAttribute('data-sound-id'),
    )
    expect(buttons).toHaveLength(24)
  })

  it('passes the Nature color tokens to Nature-category SoundCards', () => {
    renderGrid()
    const rainBtn = screen.getByLabelText(/Gentle Rain — tap to add to mix/)
    expect(rainBtn.className).toContain('bg-emerald-500/[0.08]')
    expect(rainBtn.className).toContain('border-emerald-400/20')
  })

  it('passes the Spiritual color tokens to Spiritual-category SoundCards', () => {
    renderGrid()
    const choir = screen.getByLabelText(/Choir Hum — tap to add to mix/)
    expect(choir.className).toContain('bg-violet-500/[0.08]')
    expect(choir.className).toContain('border-violet-400/20')
  })

  it('active Nature sound shows emerald active glow', () => {
    renderGrid({ activeSoundIds: new Set(['gentle-rain']) })
    const rainBtn = screen.getByLabelText(/Gentle Rain — playing, tap to remove/)
    expect(rainBtn.className).toContain('shadow-[0_0_16px_rgba(52,211,153,0.45)]')
  })

  it('active Spiritual sound shows violet active glow (distinct from Nature)', () => {
    renderGrid({ activeSoundIds: new Set(['choir-hum']) })
    const choir = screen.getByLabelText(/Choir Hum — playing, tap to remove/)
    expect(choir.className).toContain('shadow-[0_0_16px_rgba(167,139,250,0.45)]')
  })

  it('passes isLoading=true for sounds in loadingSoundIds set', () => {
    renderGrid({ loadingSoundIds: new Set(['ocean-waves']) })
    const wavesBtn = screen.getByLabelText(/Loading Ocean Waves/)
    expect(wavesBtn).toHaveAttribute('aria-busy', 'true')
  })

  it('passes hasError=true for sounds in errorSoundIds set', () => {
    renderGrid({ errorSoundIds: new Set(['fireplace']) })
    const fpBtn = screen.getByLabelText(/Couldn't load Fireplace/)
    expect(fpBtn).toBeInTheDocument()
  })

  it('each category section has aria-labelledby linking to its heading id', () => {
    renderGrid()
    const sections = document.querySelectorAll('section')
    expect(sections.length).toBe(4)
    for (const section of sections) {
      const labelledBy = section.getAttribute('aria-labelledby')
      expect(labelledBy).toBeTruthy()
      expect(labelledBy).toMatch(/^category-/)
      const header = document.getElementById(labelledBy!)
      expect(header).toBeInTheDocument()
      expect(header?.tagName).toBe('H3')
    }
  })
})
