import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ScriptureCollectionRow } from '../ScriptureCollectionRow'
import type { ScriptureCollection } from '@/types/music'

const MOCK_COLLECTION: ScriptureCollection = {
  id: 'psalms-of-peace',
  name: 'Psalms of Peace',
  readings: [
    {
      id: 'psalm-23',
      title: 'The Lord is My Shepherd',
      scriptureReference: 'Psalm 23',
      collectionId: 'psalms-of-peace',
      webText: 'Yahweh is my shepherd.',
      audioFilename: 'scripture/psalm-23.mp3',
      durationSeconds: 300,
      voiceId: 'male',
      tags: ['peace'],
    },
    {
      id: 'psalm-46',
      title: 'God is Our Refuge',
      scriptureReference: 'Psalm 46',
      collectionId: 'psalms-of-peace',
      webText: 'God is our refuge.',
      audioFilename: 'scripture/psalm-46.mp3',
      durationSeconds: 360,
      voiceId: 'female',
      tags: ['peace'],
    },
  ],
}

describe('ScriptureCollectionRow', () => {
  it('renders the collection name as heading', () => {
    render(<ScriptureCollectionRow collection={MOCK_COLLECTION} onPlay={vi.fn()} />)

    expect(
      screen.getByRole('heading', { name: 'Psalms of Peace' }),
    ).toBeInTheDocument()
  })

  it('renders all readings in the collection', () => {
    render(<ScriptureCollectionRow collection={MOCK_COLLECTION} onPlay={vi.fn()} />)

    expect(screen.getByText('The Lord is My Shepherd')).toBeInTheDocument()
    expect(screen.getByText('God is Our Refuge')).toBeInTheDocument()
  })
})
