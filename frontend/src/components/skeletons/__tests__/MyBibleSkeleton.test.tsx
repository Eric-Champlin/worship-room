import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MyBibleSkeleton } from '../MyBibleSkeleton'

describe('MyBibleSkeleton', () => {
  it('renders loading placeholders', () => {
    const { container } = render(<MyBibleSkeleton />)
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(screen.getByText('Loading')).toBeInTheDocument()
  })
})
