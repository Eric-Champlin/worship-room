import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from '@/App'

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(document.body).toBeTruthy()
  })

  it('renders the home page at /', async () => {
    render(<App />)
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /how're you feeling today/i })
      ).toBeInTheDocument()
    })
  })
})
