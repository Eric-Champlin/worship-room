import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ScriptureConnections } from '../ScriptureConnections'

describe('ScriptureConnections', () => {
  it('renders list items with data', () => {
    render(<ScriptureConnections hasData={true} />)
    expect(screen.getByText('Psalm 34:18')).toBeInTheDocument()
    expect(screen.getByText('Psalm 46:10')).toBeInTheDocument()
    expect(screen.getByText('Psalm 107:1')).toBeInTheDocument()
    expect(screen.getByText('Psalm 55:22')).toBeInTheDocument()
  })

  it('uses serif font for references', () => {
    render(<ScriptureConnections hasData={true} />)
    const ref = screen.getByText('Psalm 34:18')
    expect(ref.className).toContain('font-serif')
  })

  it('shows mood color dots', () => {
    const { container } = render(<ScriptureConnections hasData={true} />)
    const dots = container.querySelectorAll('.rounded-full.h-2.w-2')
    expect(dots.length).toBe(4)
    // Check that dots have mood colors
    const colors = Array.from(dots).map(
      (d) => (d as HTMLElement).style.backgroundColor,
    )
    expect(colors).toContain('rgb(45, 212, 191)') // Good #2DD4BF
    expect(colors).toContain('rgb(52, 211, 153)') // Thriving #34D399
  })

  it('shows empty state when no data', () => {
    render(<ScriptureConnections hasData={false} />)
    expect(
      screen.getByText(/as you check in and read scripture/i),
    ).toBeInTheDocument()
  })

  it('disclaimer visible with data', () => {
    render(<ScriptureConnections hasData={true} />)
    expect(
      screen.getByText(/based on example data\. personalized connections/i),
    ).toBeInTheDocument()
  })

  it('section title is Scriptures That Spoke to You', () => {
    render(<ScriptureConnections hasData={true} />)
    expect(
      screen.getByRole('heading', { name: /scriptures that spoke to you/i }),
    ).toBeInTheDocument()
  })
})
