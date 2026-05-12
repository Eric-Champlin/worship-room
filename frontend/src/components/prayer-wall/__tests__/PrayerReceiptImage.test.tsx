import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { PrayerReceiptImage } from '../PrayerReceiptImage'
import type { PrayerReceiptResponse } from '@/types/prayer-receipt'
import type { PrayerReceiptVerse } from '@/constants/prayer-receipt-verses'

const VERSE: PrayerReceiptVerse = {
  reference: 'Psalm 34:18',
  text: 'Yahweh is near to those who have a broken heart, and saves those who have a crushed spirit.',
}

const RECEIPT_1: PrayerReceiptResponse = {
  totalCount: 1,
  attributedIntercessors: [{ userId: 'f1', displayName: 'Friend', avatarUrl: null }],
  anonymousCount: 0,
}

const RECEIPT_3: PrayerReceiptResponse = {
  totalCount: 3,
  attributedIntercessors: [],
  anonymousCount: 3,
}

describe('PrayerReceiptImage (Spec 6.1 share-card)', () => {
  it('renders the post excerpt', () => {
    render(
      <PrayerReceiptImage
        postExcerpt="Please pray for my family"
        receipt={RECEIPT_1}
        verse={VERSE}
      />,
    )
    expect(screen.getByText('Please pray for my family')).toBeInTheDocument()
  })

  it('renders "1 person is praying for you" for totalCount=1', () => {
    render(
      <PrayerReceiptImage postExcerpt="" receipt={RECEIPT_1} verse={VERSE} />,
    )
    expect(screen.getByText('1 person is praying for you')).toBeInTheDocument()
  })

  it('renders "N people are praying for you" for totalCount > 1', () => {
    render(
      <PrayerReceiptImage postExcerpt="" receipt={RECEIPT_3} verse={VERSE} />,
    )
    expect(screen.getByText('3 people are praying for you')).toBeInTheDocument()
  })

  it('renders the verse text + reference + (WEB) attribution', () => {
    render(
      <PrayerReceiptImage postExcerpt="" receipt={RECEIPT_1} verse={VERSE} />,
    )
    // Quote marks wrap the verse text
    expect(screen.getByText(/Yahweh is near to those who have a broken heart/)).toBeInTheDocument()
    expect(screen.getByText(/Psalm 34:18 \(WEB\)/)).toBeInTheDocument()
  })

  it('renders the "Worship Room" wordmark', () => {
    render(
      <PrayerReceiptImage postExcerpt="" receipt={RECEIPT_1} verse={VERSE} />,
    )
    expect(screen.getByText('Worship Room')).toBeInTheDocument()
  })

  it('positions card off-screen for html2canvas capture (W34)', () => {
    render(
      <PrayerReceiptImage postExcerpt="" receipt={RECEIPT_1} verse={VERSE} />,
    )
    const card = screen.getByTestId('prayer-receipt-image')
    // Off-screen positioning is set via inline style
    expect(card.style.position).toBe('fixed')
    expect(card.style.left).toBe('-99999px')
    expect(card.style.width).toBe('1080px')
    expect(card.style.height).toBe('1080px')
  })
})
