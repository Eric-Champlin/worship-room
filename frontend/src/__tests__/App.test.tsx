import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from '@/App'

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(document.body).toBeTruthy()
  })

  it('renders the home page at /', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { level: 1, name: /how're you feeling today/i })
    ).toBeInTheDocument()
  })
})
