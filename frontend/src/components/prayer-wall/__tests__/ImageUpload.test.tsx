import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ImageUpload } from '../ImageUpload'
import * as prayerWallApi from '@/services/api/prayer-wall-api'

vi.mock('@/services/api/prayer-wall-api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api/prayer-wall-api')>(
    '@/services/api/prayer-wall-api',
  )
  return { ...actual, uploadImage: vi.fn() }
})

const uploadImageMock = vi.mocked(prayerWallApi.uploadImage)

const baseProps = {
  onUploadSuccess: vi.fn(),
  onUploadRemoved: vi.fn(),
  altText: '',
  onAltTextChange: vi.fn(),
}

describe('ImageUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the "Add a photo" button in idle state', () => {
    render(<ImageUpload {...baseProps} />)
    expect(screen.getByRole('button', { name: /add a photo/i })).toBeInTheDocument()
  })

  it('renders helper text when provided', () => {
    render(<ImageUpload {...baseProps} helperText="Add a photo if it tells the story." />)
    expect(screen.getByText('Add a photo if it tells the story.')).toBeInTheDocument()
  })

  it('rejects HEIC files client-side with helpful copy', async () => {
    render(<ImageUpload {...baseProps} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['fake'], 'photo.heic', { type: 'image/heic' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/heic images aren't supported/i)
    })
    expect(uploadImageMock).not.toHaveBeenCalled()
  })

  it('rejects oversized files client-side', async () => {
    render(<ImageUpload {...baseProps} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const oversizedBytes = new Uint8Array(6 * 1024 * 1024) // 6 MB
    const file = new File([oversizedBytes], 'huge.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/larger than 5 mb/i)
    })
    expect(uploadImageMock).not.toHaveBeenCalled()
  })

  it('calls onUploadSuccess after successful upload', async () => {
    uploadImageMock.mockResolvedValue({
      uploadId: 'aaaa-bbbb-cccc-dddd',
      full: 'https://signed/full.jpg',
      medium: 'https://signed/medium.jpg',
      thumb: 'https://signed/thumb.jpg',
    })

    const onUploadSuccess = vi.fn()
    render(<ImageUpload {...baseProps} onUploadSuccess={onUploadSuccess} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['fake'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(onUploadSuccess).toHaveBeenCalledWith(
        'aaaa-bbbb-cccc-dddd',
        'https://signed/medium.jpg',
      )
    })
  })

  it('shows loading state during upload', async () => {
    let resolveUpload: (v: { uploadId: string; full: string; medium: string; thumb: string }) => void
    uploadImageMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve
        }),
    )

    render(<ImageUpload {...baseProps} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['fake'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText('Uploading…')).toBeInTheDocument()
    })

    resolveUpload!({
      uploadId: 'a',
      full: 'f',
      medium: 'm',
      thumb: 't',
    })
  })

  it('shows error state when upload throws', async () => {
    uploadImageMock.mockRejectedValue(new Error('Upload failed'))

    render(<ImageUpload {...baseProps} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['fake'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('renders alt text input in preview state', async () => {
    uploadImageMock.mockResolvedValue({
      uploadId: 'a',
      full: 'f',
      medium: 'https://signed/m.jpg',
      thumb: 't',
    })

    render(<ImageUpload {...baseProps} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, {
      target: { files: [new File(['x'], 'x.jpg', { type: 'image/jpeg' })] },
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/short description/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/required for accessibility/i)).toBeInTheDocument()
  })

  it('alt text input is required and aria-required', async () => {
    uploadImageMock.mockResolvedValue({
      uploadId: 'a',
      full: 'f',
      medium: 'https://signed/m.jpg',
      thumb: 't',
    })

    render(<ImageUpload {...baseProps} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, {
      target: { files: [new File(['x'], 'x.jpg', { type: 'image/jpeg' })] },
    })

    const altInput = await screen.findByPlaceholderText(/short description/i)
    expect(altInput).toBeRequired()
    expect(altInput).toHaveAttribute('aria-required', 'true')
  })

  it('Remove button calls onUploadRemoved', async () => {
    uploadImageMock.mockResolvedValue({
      uploadId: 'a',
      full: 'f',
      medium: 'https://signed/m.jpg',
      thumb: 't',
    })

    const onUploadRemoved = vi.fn()
    render(<ImageUpload {...baseProps} onUploadRemoved={onUploadRemoved} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, {
      target: { files: [new File(['x'], 'x.jpg', { type: 'image/jpeg' })] },
    })

    const removeButton = await screen.findByRole('button', { name: /remove image/i })
    fireEvent.click(removeButton)
    expect(onUploadRemoved).toHaveBeenCalled()
  })

  it('alt text input accepts user typing and calls onAltTextChange', async () => {
    uploadImageMock.mockResolvedValue({
      uploadId: 'a',
      full: 'f',
      medium: 'https://signed/m.jpg',
      thumb: 't',
    })

    const onAltTextChange = vi.fn()
    render(<ImageUpload {...baseProps} onAltTextChange={onAltTextChange} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, {
      target: { files: [new File(['x'], 'x.jpg', { type: 'image/jpeg' })] },
    })

    const altInput = await screen.findByPlaceholderText(/short description/i)
    fireEvent.change(altInput, { target: { value: 'A baby smiling' } })
    expect(onAltTextChange).toHaveBeenCalledWith('A baby smiling')
  })
})
