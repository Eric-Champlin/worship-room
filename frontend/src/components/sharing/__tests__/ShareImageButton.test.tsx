import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShareImageButton } from '../ShareImageButton'

// Mock useToastSafe
const mockShowToast = vi.fn()
vi.mock('@/components/ui/Toast', () => ({
  useToastSafe: () => ({ showToast: mockShowToast }),
}))

const mockGenerateImage = vi.fn()
const testBlob = new Blob(['test'], { type: 'image/png' })

beforeEach(() => {
  vi.clearAllMocks()
  mockGenerateImage.mockResolvedValue(testBlob)

  // Reset navigator to have no share/clipboard by default
  Object.defineProperty(navigator, 'share', { value: undefined, writable: true, configurable: true })
  Object.defineProperty(navigator, 'canShare', { value: undefined, writable: true, configurable: true })
  Object.defineProperty(navigator, 'clipboard', { value: undefined, writable: true, configurable: true })
})

describe('ShareImageButton', () => {
  it('renders with Share label and icon', () => {
    render(
      <ShareImageButton generateImage={mockGenerateImage} filename="test.png" />,
    )
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()
    expect(screen.getByText('Share')).toBeInTheDocument()
  })

  it('calls generateImage on click', async () => {
    const user = userEvent.setup()
    render(
      <ShareImageButton generateImage={mockGenerateImage} filename="test.png" />,
    )
    await user.click(screen.getByRole('button'))
    expect(mockGenerateImage).toHaveBeenCalledOnce()
  })

  it('shows loading state while generating', async () => {
    let resolveGenerate!: (blob: Blob) => void
    mockGenerateImage.mockReturnValue(
      new Promise<Blob>((resolve) => {
        resolveGenerate = resolve
      }),
    )

    const user = userEvent.setup()
    render(
      <ShareImageButton generateImage={mockGenerateImage} filename="test.png" />,
    )
    await user.click(screen.getByRole('button'))

    expect(screen.getByText('Sharing...')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()

    resolveGenerate(testBlob)
    await waitFor(() => {
      expect(screen.getByText('Share')).toBeInTheDocument()
    })
  })

  it('uses Web Share API when available', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined)
    const mockCanShare = vi.fn().mockReturnValue(true)
    Object.defineProperty(navigator, 'share', { value: mockShare, writable: true, configurable: true })
    Object.defineProperty(navigator, 'canShare', { value: mockCanShare, writable: true, configurable: true })

    const user = userEvent.setup()
    render(
      <ShareImageButton
        generateImage={mockGenerateImage}
        filename="test.png"
        shareTitle="Test Title"
        shareText="Test text"
      />,
    )
    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Title',
          text: 'Test text',
          files: expect.arrayContaining([expect.any(File)]),
        }),
      )
    })
  })

  it('falls back to download when Web Share and clipboard unavailable', async () => {
    // navigator.share and clipboard are both undefined (from beforeEach)
    // ClipboardItem not in window (jsdom default) → skips clipboard → downloads
    let downloadFilename = ''
    const origCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) => {
      const el = origCreateElement(tag, options)
      if (tag === 'a') {
        let _download = ''
        Object.defineProperty(el, 'download', {
          get: () => _download,
          set: (v: string) => { _download = v; downloadFilename = v },
        })
        vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(() => {})
      }
      return el
    })

    const user = userEvent.setup()
    render(
      <ShareImageButton generateImage={mockGenerateImage} filename="my-image.png" />,
    )
    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(downloadFilename).toBe('my-image.png')
      expect(mockShowToast).toHaveBeenCalledWith('Image saved.')
    })

    vi.restoreAllMocks()
  })

  it('shows error toast on failure', async () => {
    mockGenerateImage.mockRejectedValue(new Error('Canvas failed'))

    const user = userEvent.setup()
    render(
      <ShareImageButton generateImage={mockGenerateImage} filename="test.png" />,
    )
    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith("We couldn't share that. Try again.")
    })
  })

  it('ignores AbortError (user cancelled)', async () => {
    const abortError = new Error('User cancelled')
    abortError.name = 'AbortError'
    const mockShare = vi.fn().mockRejectedValue(abortError)
    const mockCanShare = vi.fn().mockReturnValue(true)
    Object.defineProperty(navigator, 'share', { value: mockShare, writable: true, configurable: true })
    Object.defineProperty(navigator, 'canShare', { value: mockCanShare, writable: true, configurable: true })

    const user = userEvent.setup()
    render(
      <ShareImageButton generateImage={mockGenerateImage} filename="test.png" />,
    )
    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Share')).toBeInTheDocument()
    })
    expect(mockShowToast).not.toHaveBeenCalled()
  })

  it('accepts custom className and label', () => {
    render(
      <ShareImageButton
        generateImage={mockGenerateImage}
        filename="test.png"
        className="custom-class"
        label="Share Progress"
      />,
    )
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
    expect(screen.getByText('Share Progress')).toBeInTheDocument()
  })

  it('ghost variant has correct classes', () => {
    render(
      <ShareImageButton
        generateImage={mockGenerateImage}
        filename="test.png"
        variant="ghost"
      />,
    )
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-white/10')
    expect(button).toHaveClass('rounded-full')
  })

  it('primary variant has correct classes by default', () => {
    render(
      <ShareImageButton
        generateImage={mockGenerateImage}
        filename="test.png"
      />,
    )
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-primary')
    expect(button).toHaveClass('rounded-lg')
  })
})
