import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { BibleSettingsModal } from '../BibleSettingsModal'
import type { BibleExportV1 } from '@/types/bible-export'

// Mock dependencies
vi.mock('@/lib/bible/exportBuilder', () => ({
  buildExport: vi.fn(() => ({
    schemaVersion: 1,
    exportedAt: '2026-04-06T14:30:00.000Z',
    appVersion: 'worship-room-bible-wave-1',
    data: {
      highlights: [{ id: 'h1' }],
      bookmarks: [],
      notes: [],
      prayers: [],
      journals: [],
      meditations: [],
    },
  })),
}))

vi.mock('@/lib/bible/importValidator', () => ({
  validateExport: vi.fn(),
}))

vi.mock('@/lib/bible/importApplier', () => ({
  applyReplace: vi.fn(() => ({
    mode: 'replace',
    totalItems: 5,
    highlights: { added: 5, updated: 0, skipped: 0 },
    bookmarks: { added: 0, updated: 0, skipped: 0 },
    notes: { added: 0, updated: 0, skipped: 0 },
    prayers: { added: 0, updated: 0, skipped: 0 },
    journals: { added: 0, updated: 0, skipped: 0 },
    meditations: { added: 0, updated: 0, skipped: 0 },
  })),
  applyMerge: vi.fn(() => ({
    mode: 'merge',
    totalItems: 3,
    highlights: { added: 2, updated: 1, skipped: 0 },
    bookmarks: { added: 0, updated: 0, skipped: 0 },
    notes: { added: 0, updated: 0, skipped: 0 },
    prayers: { added: 0, updated: 0, skipped: 0 },
    journals: { added: 0, updated: 0, skipped: 0 },
    meditations: { added: 0, updated: 0, skipped: 0 },
  })),
}))

import { buildExport } from '@/lib/bible/exportBuilder'
import { validateExport } from '@/lib/bible/importValidator'
import { applyReplace, applyMerge } from '@/lib/bible/importApplier'

function renderModal(props: Partial<React.ComponentProps<typeof BibleSettingsModal>> = {}) {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onImportComplete: vi.fn(),
    ...props,
  }
  return {
    ...render(
      <MemoryRouter>
        <ToastProvider>
          <BibleSettingsModal {...defaultProps} />
        </ToastProvider>
      </MemoryRouter>,
    ),
    ...defaultProps,
  }
}

function makeValidExportFile(): BibleExportV1 {
  return {
    schemaVersion: 1,
    exportedAt: '2026-04-06T14:30:00.000Z',
    appVersion: 'worship-room-bible-wave-1',
    data: {
      highlights: [
        { id: 'h1', book: 'john', chapter: 3, startVerse: 16, endVerse: 16, color: 'peace', createdAt: 1000, updatedAt: 1000 },
      ],
      bookmarks: [
        { id: 'b1', book: 'psalms', chapter: 23, startVerse: 1, endVerse: 6, createdAt: 1000 },
      ],
      notes: [],
      prayers: [],
      journals: [],
      meditations: [],
    },
  }
}

async function uploadFile(fileContent: string) {
  const user = userEvent.setup()
  const file = new File([fileContent], 'export.json', { type: 'application/json' })
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(input, file)
}

describe('BibleSettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock URL methods
    vi.stubGlobal('URL', {
      ...globalThis.URL,
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    })
  })

  // --- Render tests ---

  it('renders export section with heading and download button', () => {
    renderModal()
    expect(screen.getByText('Export your data')).toBeInTheDocument()
    expect(screen.getByText('Download export')).toBeInTheDocument()
  })

  it('renders import section with heading and file picker', () => {
    renderModal()
    expect(screen.getByText('Import data')).toBeInTheDocument()
    expect(screen.getByText('Choose file')).toBeInTheDocument()
  })

  it('returns null when not open', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <BibleSettingsModal isOpen={false} onClose={vi.fn()} onImportComplete={vi.fn()} />
        </ToastProvider>
      </MemoryRouter>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  // --- Export tests ---

  it('download button calls buildExport and triggers download', async () => {
    const user = userEvent.setup()
    renderModal()

    const appendSpy = vi.spyOn(document.body, 'appendChild')
    await user.click(screen.getByText('Download export'))

    expect(buildExport).toHaveBeenCalled()
    expect(appendSpy).toHaveBeenCalled()
    appendSpy.mockRestore()
  })

  // --- File picker ---

  it('file picker accepts only .json files', () => {
    renderModal()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input.accept).toBe('application/json')
  })

  it('file picker has aria-label', () => {
    renderModal()
    expect(screen.getByLabelText('Choose a JSON file to import')).toBeInTheDocument()
  })

  // --- Valid file shows preview ---

  it('valid file shows import preview with counts', async () => {
    const validExport = makeValidExportFile()
    vi.mocked(validateExport).mockReturnValue({ valid: true, export: validExport })

    renderModal()
    await uploadFile(JSON.stringify(validExport))

    await waitFor(() => {
      expect(screen.getByText('highlights')).toBeInTheDocument()
      expect(screen.getByText('bookmarks')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Replace local data' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Merge with local data' })).toBeInTheDocument()
    })
  })

  // --- Invalid file shows error ---

  it('invalid file shows error message', async () => {
    vi.mocked(validateExport).mockReturnValue({
      valid: false,
      error: "This file isn't a valid Worship Room export. It might be corrupted or from a different app.",
    })

    renderModal()
    await uploadFile('{"bad":"data"}')

    await waitFor(() => {
      expect(
        screen.getByText("This file isn't a valid Worship Room export. It might be corrupted or from a different app."),
      ).toBeInTheDocument()
    })
  })

  it('newer schema version shows version-mismatch error', async () => {
    vi.mocked(validateExport).mockReturnValue({
      valid: false,
      error: 'This export was made with a newer version of Worship Room. Update the app to import it.',
    })

    renderModal()
    await uploadFile(JSON.stringify({ schemaVersion: 2 }))

    await waitFor(() => {
      expect(
        screen.getByText('This export was made with a newer version of Worship Room. Update the app to import it.'),
      ).toBeInTheDocument()
    })
  })

  // --- Cancel in error state ---

  it('cancel button in error state returns to idle', async () => {
    const user = userEvent.setup()
    vi.mocked(validateExport).mockReturnValue({
      valid: false,
      error: "This file isn't a valid Worship Room export. It might be corrupted or from a different app.",
    })

    renderModal()
    await uploadFile('bad')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(
      screen.queryByText("This file isn't a valid Worship Room export. It might be corrupted or from a different app."),
    ).not.toBeInTheDocument()
  })

  // --- Replace and Merge ---

  it('replace button calls applyReplace and shows toast', async () => {
    const user = userEvent.setup()
    const validExport = makeValidExportFile()
    vi.mocked(validateExport).mockReturnValue({ valid: true, export: validExport })

    const { onImportComplete } = renderModal()
    await uploadFile(JSON.stringify(validExport))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Replace local data' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Replace local data' }))

    expect(applyReplace).toHaveBeenCalledWith(validExport.data)
    expect(onImportComplete).toHaveBeenCalled()
  })

  it('merge button calls applyMerge and shows toast', async () => {
    const user = userEvent.setup()
    const validExport = makeValidExportFile()
    vi.mocked(validateExport).mockReturnValue({ valid: true, export: validExport })

    const { onImportComplete } = renderModal()
    await uploadFile(JSON.stringify(validExport))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Merge with local data' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Merge with local data' }))

    expect(applyMerge).toHaveBeenCalledWith(validExport.data)
    expect(onImportComplete).toHaveBeenCalled()
  })

  // --- Cancel in preview state ---

  it('cancel button in preview state returns to idle', async () => {
    const user = userEvent.setup()
    const validExport = makeValidExportFile()
    vi.mocked(validateExport).mockReturnValue({ valid: true, export: validExport })

    renderModal()
    await uploadFile(JSON.stringify(validExport))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('button', { name: 'Replace local data' })).not.toBeInTheDocument()
  })

  // --- Replace warning ---

  it('replace warning text visible on focus, hidden otherwise', async () => {
    const user = userEvent.setup()
    const validExport = makeValidExportFile()
    vi.mocked(validateExport).mockReturnValue({ valid: true, export: validExport })

    renderModal()
    await uploadFile(JSON.stringify(validExport))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Replace local data' })).toBeInTheDocument()
    })

    const warning = screen.getByRole('alert')
    expect(warning).toHaveClass('opacity-0')

    // Focus the replace button
    await user.tab()
    // Navigate to Replace button
    const replaceBtn = screen.getByRole('button', { name: 'Replace local data' })
    replaceBtn.focus()

    await waitFor(() => {
      expect(warning).toHaveClass('opacity-100')
    })
  })

  it('replace button has aria-describedby pointing to warning', async () => {
    const validExport = makeValidExportFile()
    vi.mocked(validateExport).mockReturnValue({ valid: true, export: validExport })

    renderModal()
    await uploadFile(JSON.stringify(validExport))

    await waitFor(() => {
      const replaceBtn = screen.getByRole('button', { name: 'Replace local data' })
      expect(replaceBtn).toHaveAttribute('aria-describedby', 'replace-warning')
    })
  })

  // --- Modal close behaviors ---

  it('modal closes on backdrop click', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()

    // Click the outermost backdrop container
    const backdrop = screen.getByRole('dialog').closest('[class*="fixed inset-0"]')!
    await user.click(backdrop)

    expect(onClose).toHaveBeenCalled()
  })

  it('modal closes on Escape key', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })

  // --- onImportComplete ---

  it('onImportComplete called after successful import', async () => {
    const user = userEvent.setup()
    const validExport = makeValidExportFile()
    vi.mocked(validateExport).mockReturnValue({ valid: true, export: validExport })

    const { onImportComplete } = renderModal()
    await uploadFile(JSON.stringify(validExport))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Merge with local data' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Merge with local data' }))

    expect(onImportComplete).toHaveBeenCalledTimes(1)
  })
})
