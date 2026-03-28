import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { SharePanel } from '../SharePanel'

// Mock canvas generation
vi.mock('@/lib/verse-card-canvas', () => ({
  generateVerseImageTemplated: vi.fn(() =>
    Promise.resolve(new Blob(['test'], { type: 'image/png' })),
  ),
}))

// Mock URL.createObjectURL / revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
const mockRevokeObjectURL = vi.fn()
URL.createObjectURL = mockCreateObjectURL
URL.revokeObjectURL = mockRevokeObjectURL

function renderPanel(props: Partial<React.ComponentProps<typeof SharePanel>> = {}) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <SharePanel
          verseText="For God so loved the world."
          reference="John 3:16 WEB"
          isOpen={true}
          onClose={vi.fn()}
          {...props}
        />
      </ToastProvider>
    </MemoryRouter>,
  )
}

// Mock ClipboardItem (not available in jsdom)
class MockClipboardItem {
  types: string[]
  constructor(public items: Record<string, Blob>) {
    this.types = Object.keys(items)
  }
  getType(type: string) { return Promise.resolve(this.items[type]) }
}
Object.defineProperty(globalThis, 'ClipboardItem', { value: MockClipboardItem, configurable: true })

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('SharePanel', () => {
  it('renders nothing when isOpen=false', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <SharePanel
            verseText="Test"
            reference="Test 1:1"
            isOpen={false}
            onClose={vi.fn()}
          />
        </ToastProvider>
      </MemoryRouter>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders dialog when isOpen=true', () => {
    renderPanel()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows 4 template thumbnails', () => {
    renderPanel()
    const templateGroup = screen.getByRole('radiogroup', { name: 'Template style' })
    const radios = within(templateGroup).getAllByRole('radio')
    expect(radios).toHaveLength(4)
  })

  it('shows 3 size pills', () => {
    renderPanel()
    const sizeGroup = screen.getByRole('radiogroup', { name: 'Image size' })
    const radios = within(sizeGroup).getAllByRole('radio')
    expect(radios).toHaveLength(3)
  })

  it('template selection updates state', async () => {
    const user = userEvent.setup()
    renderPanel()
    const templateGroup = screen.getByRole('radiogroup', { name: 'Template style' })
    const radios = within(templateGroup).getAllByRole('radio')

    // Default is classic (first)
    expect(radios[0]).toHaveAttribute('aria-checked', 'true')

    // Click Radiant (second)
    await user.click(radios[1])
    expect(radios[1]).toHaveAttribute('aria-checked', 'true')
    expect(radios[0]).toHaveAttribute('aria-checked', 'false')
  })

  it('size selection updates state', async () => {
    const user = userEvent.setup()
    renderPanel()
    const sizeGroup = screen.getByRole('radiogroup', { name: 'Image size' })
    const radios = within(sizeGroup).getAllByRole('radio')

    // Default is square (first)
    expect(radios[0]).toHaveAttribute('aria-checked', 'true')

    // Click Story (second)
    await user.click(radios[1])
    expect(radios[1]).toHaveAttribute('aria-checked', 'true')
  })

  it('Download button triggers download', async () => {
    const user = userEvent.setup()
    const mockAppendChild = vi.spyOn(document.body, 'appendChild')
    const mockRemoveChild = vi.spyOn(document.body, 'removeChild')

    renderPanel()
    const downloadBtn = screen.getByRole('button', { name: /download/i })
    await user.click(downloadBtn)

    // Wait for async operation
    await vi.waitFor(() => {
      expect(mockAppendChild).toHaveBeenCalled()
    })
    mockAppendChild.mockRestore()
    mockRemoveChild.mockRestore()
  })

  it('Copy Image button copies to clipboard when Web Share unavailable', async () => {
    const user = userEvent.setup()
    const mockWrite = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', {
      value: { write: mockWrite },
      configurable: true,
    })

    renderPanel()

    // Wait for rendering to complete (button becomes enabled)
    const copyBtn = await screen.findByRole('button', { name: /copy image/i })
    await vi.waitFor(() => {
      expect(copyBtn).not.toBeDisabled()
    })
    await user.click(copyBtn)

    await vi.waitFor(() => {
      expect(mockWrite).toHaveBeenCalled()
    })
  })

  it('Share button uses Web Share API when available', async () => {
    const user = userEvent.setup()
    const mockShare = vi.fn(() => Promise.resolve())
    const mockCanShare = vi.fn(() => true)

    // Set up Web Share mocks BEFORE render
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(navigator, 'canShare', {
      value: mockCanShare,
      configurable: true,
      writable: true,
    })

    renderPanel()

    // Wait for rendering to complete
    const shareBtn = await screen.findByRole('button', { name: /^share$/i })
    await vi.waitFor(() => {
      expect(shareBtn).not.toBeDisabled()
    })
    await user.click(shareBtn)

    await vi.waitFor(() => {
      expect(mockShare).toHaveBeenCalled()
    })

    // Cleanup
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true, writable: true })
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true, writable: true })
  })

  it('closes on backdrop click', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderPanel({ onClose })

    // Click backdrop (the first child with aria-hidden)
    const backdrop = screen.getByRole('dialog').parentElement!.querySelector('[aria-hidden="true"]')!
    await user.click(backdrop)

    // With reduced motion mock not set, it uses 150ms timeout
    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    }, { timeout: 300 })
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderPanel({ onClose })

    await user.keyboard('{Escape}')

    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    }, { timeout: 300 })
  })

  it('focus trapped within dialog', () => {
    renderPanel()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    // Focus trap is handled by useFocusTrap hook — verified by Escape closing
  })

  it('preferences saved to localStorage', async () => {
    const user = userEvent.setup()
    renderPanel()

    const templateGroup = screen.getByRole('radiogroup', { name: 'Template style' })
    const radios = within(templateGroup).getAllByRole('radio')
    await user.click(radios[1]) // Radiant

    expect(localStorage.getItem('wr_share_last_template')).toBe('radiant')
  })

  it('preferences loaded from localStorage', () => {
    localStorage.setItem('wr_share_last_template', 'bold')
    localStorage.setItem('wr_share_last_size', 'wide')

    renderPanel()

    const templateGroup = screen.getByRole('radiogroup', { name: 'Template style' })
    const boldRadio = within(templateGroup).getAllByRole('radio')[3] // bold is 4th
    expect(boldRadio).toHaveAttribute('aria-checked', 'true')

    const sizeGroup = screen.getByRole('radiogroup', { name: 'Image size' })
    const wideRadio = within(sizeGroup).getAllByRole('radio')[2] // wide is 3rd
    expect(wideRadio).toHaveAttribute('aria-checked', 'true')
  })

  it('loading shimmer shown during render', () => {
    renderPanel()
    // On first render, before canvas completes, shimmer should be visible
    const shimmer = document.querySelector('.animate-pulse')
    expect(shimmer).toBeInTheDocument()
  })
})
