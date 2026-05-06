import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ContentPicker } from '../ContentPicker'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/data/scenes', () => ({
  SCENE_PRESETS: [
    { id: 'rain', name: 'Rain', description: 'Gentle rain', sounds: ['rain-1', 'rain-2'] },
  ],
}))

vi.mock('@/data/music/scripture-readings', () => ({
  SCRIPTURE_COLLECTIONS: [
    {
      id: 'psalms',
      name: 'Psalms',
      readings: [{ id: 'ps23', title: 'Psalm 23', scriptureReference: 'Psalm 23' }],
    },
  ],
}))

vi.mock('@/data/music/bedtime-stories', () => ({
  BEDTIME_STORIES: [
    { id: 'story-1', title: 'The Good Shepherd', description: 'A peaceful story', durationSeconds: 300 },
  ],
}))

vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ current: null }),
}))

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ContentPicker — Step 8 visual migration', () => {
  it('active tab uses muted-white (border-white/30 text-white)', () => {
    render(<ContentPicker type="scene" onSelect={vi.fn()} onClose={vi.fn()} />)
    const sceneTab = screen.getByRole('tab', { name: /Scenes/i })
    expect(sceneTab.className).toContain('border-white/30')
    expect(sceneTab.className).toContain('text-white')
    expect(sceneTab.className).not.toContain('border-primary')
    expect(sceneTab.className).not.toMatch(/\btext-primary\b/)
  })

  it('inactive tab has muted secondary styling', () => {
    render(<ContentPicker type="scene" onSelect={vi.fn()} onClose={vi.fn()} />)
    const scriptureTab = screen.getByRole('tab', { name: /Scripture/i })
    expect(scriptureTab.className).toContain('border-transparent')
    expect(scriptureTab.className).toContain('text-white/60')
  })

  it('dialog wrapper has border-white/[0.12]', () => {
    render(<ContentPicker type="scene" onSelect={vi.fn()} onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog.className).toContain('border-white/[0.12]')
  })

  it('scene card buttons use border-white/[0.12] and hover:border-white/[0.18]', () => {
    render(<ContentPicker type="scene" onSelect={vi.fn()} onClose={vi.fn()} />)
    const sceneCard = screen.getByRole('button', { name: /Rain/i })
    expect(sceneCard.className).toContain('border-white/[0.12]')
    expect(sceneCard.className).toContain('hover:border-white/[0.18]')
    expect(sceneCard.className).not.toContain('hover:border-primary')
  })
})
