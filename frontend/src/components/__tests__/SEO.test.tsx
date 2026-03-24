import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Unmock react-helmet-async for this test so we can verify real Helmet behavior
vi.unmock('react-helmet-async')

// Must import after unmock
const { HelmetProvider } = await import('react-helmet-async')
const { SEO } = await import('../SEO')

// Mock VITE_SITE_URL
vi.stubEnv('VITE_SITE_URL', 'https://worshiproom.com')

function renderSEO(props: React.ComponentProps<typeof SEO>, initialEntry = '/') {
  const helmetContext = {} as { helmet?: { title?: { toString: () => string } } }
  return render(
    <HelmetProvider context={helmetContext}>
      <MemoryRouter
        initialEntries={[initialEntry]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <SEO {...props} />
      </MemoryRouter>
    </HelmetProvider>,
  )
}

describe('SEO', () => {
  beforeEach(() => {
    // Reset document head between tests
    document.title = ''
    document.querySelectorAll('meta, link[rel="canonical"], script[type="application/ld+json"]').forEach((el) => el.remove())
  })

  it('renders title with suffix', async () => {
    renderSEO({ title: 'Daily Hub', description: 'Test description' })
    await waitFor(() => {
      expect(document.title).toBe('Daily Hub | Worship Room')
    })
  })

  it('renders title without suffix when noSuffix is true', async () => {
    renderSEO({ title: 'Worship Room — Healing', description: 'Test', noSuffix: true })
    await waitFor(() => {
      expect(document.title).toBe('Worship Room — Healing')
    })
  })

  it('renders meta description', async () => {
    renderSEO({ title: 'Test', description: 'A unique description for testing.' })
    await waitFor(() => {
      const meta = document.querySelector('meta[name="description"]')
      expect(meta).not.toBeNull()
      expect(meta!.getAttribute('content')).toBe('A unique description for testing.')
    })
  })

  it('renders canonical URL from pathname', async () => {
    renderSEO({ title: 'Test', description: 'Test' }, '/daily')
    await waitFor(() => {
      const link = document.querySelector('link[rel="canonical"]')
      expect(link).not.toBeNull()
      expect(link!.getAttribute('href')).toBe('https://worshiproom.com/daily')
    })
  })

  it('strips tab query params from canonical', async () => {
    renderSEO({ title: 'Test', description: 'Test' }, '/daily?tab=pray')
    await waitFor(() => {
      const link = document.querySelector('link[rel="canonical"]')
      expect(link!.getAttribute('href')).toBe('https://worshiproom.com/daily')
    })
  })

  it('preserves content query params like category', async () => {
    renderSEO({ title: 'Test', description: 'Test' }, '/prayer-wall?category=health')
    await waitFor(() => {
      const link = document.querySelector('link[rel="canonical"]')
      expect(link!.getAttribute('href')).toBe('https://worshiproom.com/prayer-wall?category=health')
    })
  })

  it('renders all OG tags', async () => {
    renderSEO({ title: 'Music', description: 'Music desc' }, '/music')
    await waitFor(() => {
      expect(document.querySelector('meta[property="og:title"]')!.getAttribute('content')).toBe('Music | Worship Room')
      expect(document.querySelector('meta[property="og:description"]')!.getAttribute('content')).toBe('Music desc')
      expect(document.querySelector('meta[property="og:type"]')!.getAttribute('content')).toBe('website')
      expect(document.querySelector('meta[property="og:url"]')!.getAttribute('content')).toBe('https://worshiproom.com/music')
      expect(document.querySelector('meta[property="og:image"]')!.getAttribute('content')).toBe('https://worshiproom.com/og-default.png')
      expect(document.querySelector('meta[property="og:site_name"]')!.getAttribute('content')).toBe('Worship Room')
    })
  })

  it('renders Twitter card tags', async () => {
    renderSEO({ title: 'Test', description: 'Desc' })
    await waitFor(() => {
      expect(document.querySelector('meta[name="twitter:card"]')!.getAttribute('content')).toBe('summary_large_image')
      expect(document.querySelector('meta[name="twitter:title"]')!.getAttribute('content')).toBe('Test | Worship Room')
      expect(document.querySelector('meta[name="twitter:description"]')!.getAttribute('content')).toBe('Desc')
      expect(document.querySelector('meta[name="twitter:image"]')!.getAttribute('content')).toBe('https://worshiproom.com/og-default.png')
    })
  })

  it('renders default OG image when no ogImage prop', async () => {
    renderSEO({ title: 'Test', description: 'Test' })
    await waitFor(() => {
      expect(document.querySelector('meta[property="og:image"]')!.getAttribute('content')).toBe('https://worshiproom.com/og-default.png')
    })
  })

  it('renders custom OG image when ogImage prop provided', async () => {
    renderSEO({ title: 'Test', description: 'Test', ogImage: '/custom-og.png' })
    await waitFor(() => {
      expect(document.querySelector('meta[property="og:image"]')!.getAttribute('content')).toBe('https://worshiproom.com/custom-og.png')
    })
  })

  it('renders JSON-LD script tag', async () => {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Worship Room',
    }
    renderSEO({ title: 'Test', description: 'Test', jsonLd })
    await waitFor(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]')
      expect(scripts.length).toBeGreaterThanOrEqual(1)
      const parsed = JSON.parse(scripts[0].textContent!)
      expect(parsed['@type']).toBe('Organization')
      expect(parsed.name).toBe('Worship Room')
    })
  })

  it('renders noindex when noIndex is true', async () => {
    renderSEO({ title: 'Settings', description: 'Settings', noIndex: true })
    await waitFor(() => {
      const robots = document.querySelector('meta[name="robots"]')
      expect(robots).not.toBeNull()
      expect(robots!.getAttribute('content')).toBe('noindex')
    })
  })

  it('does not render noindex by default', async () => {
    renderSEO({ title: 'Public Page', description: 'Public' })
    await waitFor(() => {
      const robots = document.querySelector('meta[name="robots"][content="noindex"]')
      expect(robots).toBeNull()
    })
  })
})
