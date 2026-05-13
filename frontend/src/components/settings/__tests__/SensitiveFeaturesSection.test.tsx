import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SensitiveFeaturesSection } from '../SensitiveFeaturesSection'

describe('SensitiveFeaturesSection (Spec 6.4)', () => {
  it('renders the section heading and helper copy', () => {
    render(
      <SensitiveFeaturesSection
        prayerWall={{
          prayerReceiptsVisible: true,
          nightMode: 'auto',
          watchEnabled: 'off',
        }}
        onUpdatePrayerWall={() => {}}
      />,
    )
    expect(screen.getByText('Sensitive features')).toBeInTheDocument()
    expect(
      screen.getByText(/designed for sensitive content/i),
    ).toBeInTheDocument()
  })

  it('wires current watchEnabled value to the WatchToggle (aria-checked reflects prop)', () => {
    const onUpdatePrayerWall = vi.fn()
    render(
      <SensitiveFeaturesSection
        prayerWall={{
          prayerReceiptsVisible: true,
          nightMode: 'auto',
          watchEnabled: 'on',
        }}
        onUpdatePrayerWall={onUpdatePrayerWall}
      />,
    )
    expect(
      screen.getByRole('radio', { name: /always during late hours/i }),
    ).toHaveAttribute('aria-checked', 'true')
  })
})
