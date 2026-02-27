import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportDialog } from '../ReportDialog'

describe('ReportDialog', () => {
  it('renders Report button', () => {
    render(<ReportDialog prayerId="prayer-1" />)
    expect(screen.getByText('Report')).toBeInTheDocument()
  })

  it('opens dialog with reason textarea on click', async () => {
    const user = userEvent.setup()
    render(<ReportDialog prayerId="prayer-1" />)
    await user.click(screen.getByText('Report'))
    expect(screen.getByText('Report Prayer Request')).toBeInTheDocument()
    expect(screen.getByLabelText('Report reason')).toBeInTheDocument()
    expect(screen.getByText('Submit Report')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('calls onReport with prayer ID and reason on submit', async () => {
    const user = userEvent.setup()
    const onReport = vi.fn()
    render(<ReportDialog prayerId="prayer-1" onReport={onReport} />)
    await user.click(screen.getByText('Report'))
    await user.type(screen.getByLabelText('Report reason'), 'Inappropriate content')
    await user.click(screen.getByText('Submit Report'))
    expect(onReport).toHaveBeenCalledWith('prayer-1', 'Inappropriate content')
  })
})
