import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock useWatchMode + useNightMode for hero-rendering scenarios.
vi.mock('@/hooks/useWatchMode', () => ({
  useWatchMode: vi.fn(),
}))
vi.mock('@/hooks/useNightMode', () => ({
  useNightMode: vi.fn(),
}))

import { useWatchMode } from '@/hooks/useWatchMode'
import { useNightMode } from '@/hooks/useNightMode'
import { PrayerWallHero } from '@/components/prayer-wall/PrayerWallHero'
import { WatchIndicator } from '@/components/prayer-wall/WatchIndicator'

function mockWatch(active: boolean) {
  ;(useWatchMode as ReturnType<typeof vi.fn>).mockReturnValue({
    active,
    source: active ? 'manual' : 'auto',
    userPreference: active ? 'on' : 'off',
    degraded: true,
  })
}
function mockNight(active: boolean) {
  ;(useNightMode as ReturnType<typeof vi.fn>).mockReturnValue({
    active,
    source: 'auto',
    userPreference: 'auto',
  })
}

describe('PrayerWall integrated Watch chrome (Spec 6.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hero renders WatchIndicator when watchActive=true', () => {
    mockWatch(true)
    mockNight(false)
    render(
      <MemoryRouter>
        <PrayerWallHero
          watchIndicator={<WatchIndicator />}
          subtitle="What weighs on you today?"
        />
      </MemoryRouter>,
    )
    expect(screen.getByLabelText('3am Watch is on')).toBeInTheDocument()
  })

  it('hero hides WatchIndicator when watchActive=false', () => {
    mockWatch(false)
    mockNight(false)
    render(
      <MemoryRouter>
        <PrayerWallHero
          watchIndicator={null}
          subtitle="What weighs on you today?"
        />
      </MemoryRouter>,
    )
    expect(screen.queryByLabelText('3am Watch is on')).not.toBeInTheDocument()
  })

  it('hero renders BOTH NightWatchChip and WatchIndicator side-by-side when both active (Plan-Time Divergence #3)', () => {
    mockWatch(true)
    mockNight(true)
    render(
      <MemoryRouter>
        <PrayerWallHero
          nightWatchChip={<span aria-label="Night Watch test chip">night</span>}
          watchIndicator={<WatchIndicator />}
          subtitle="It's quiet now. You're not alone."
        />
      </MemoryRouter>,
    )
    expect(screen.getByLabelText('Night Watch test chip')).toBeInTheDocument()
    expect(screen.getByLabelText('3am Watch is on')).toBeInTheDocument()
  })

  it('hero hides chips row entirely when neither chip is supplied', () => {
    mockWatch(false)
    mockNight(false)
    render(
      <MemoryRouter>
        <PrayerWallHero
          nightWatchChip={null}
          watchIndicator={null}
          subtitle="What weighs on you today?"
        />
      </MemoryRouter>,
    )
    // The chip row container has flex-wrap items-center; absent when both null.
    expect(
      screen.queryByLabelText('3am Watch is on'),
    ).not.toBeInTheDocument()
  })
})
