import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CategoryTag } from '../CategoryTag'
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type ChallengeCategory,
} from '@/constants/categoryColors'

const ALL_CATEGORIES: ChallengeCategory[] = ['pentecost', 'advent', 'lent', 'newyear', 'easter']

describe('CategoryTag', () => {
  it('renders all 5 category labels', () => {
    ALL_CATEGORIES.forEach((category) => {
      const { unmount } = render(<CategoryTag category={category} />)
      expect(screen.getByText(CATEGORY_LABELS[category])).toBeInTheDocument()
      unmount()
    })
  })

  it('applies bgClass and fgClass from CATEGORY_COLORS', () => {
    ALL_CATEGORIES.forEach((category) => {
      const { unmount } = render(<CategoryTag category={category} />)
      const tokens = CATEGORY_COLORS[category]
      const tag = screen.getByText(CATEGORY_LABELS[category])
      expect(tag.className).toContain(tokens.bgClass)
      expect(tag.className).toContain(tokens.fgClass)
      unmount()
    })
  })

  it('merges custom className via cn()', () => {
    render(<CategoryTag category="lent" className="ml-auto" />)
    const tag = screen.getByText('Lent')
    expect(tag.className).toContain('ml-auto')
  })

  it('CATEGORY_COLORS has all 5 keys matching ChallengeSeason enum', () => {
    const keys = Object.keys(CATEGORY_COLORS).sort()
    expect(keys).toEqual(['advent', 'easter', 'lent', 'newyear', 'pentecost'])
  })

  it('CATEGORY_LABELS has all 5 keys matching CATEGORY_COLORS', () => {
    const colorKeys = Object.keys(CATEGORY_COLORS).sort()
    const labelKeys = Object.keys(CATEGORY_LABELS).sort()
    expect(labelKeys).toEqual(colorKeys)
  })

  it('renders as an inline span element', () => {
    render(<CategoryTag category="pentecost" />)
    const tag = screen.getByText('Pentecost')
    expect(tag.tagName).toBe('SPAN')
  })
})
