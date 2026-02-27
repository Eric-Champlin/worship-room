import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Avatar } from '../Avatar'

describe('Avatar', () => {
  it('renders initials "SJ" for firstName="Sarah", lastName="Johnson"', () => {
    render(
      <Avatar firstName="Sarah" lastName="Johnson" avatarUrl={null} userId="user-1" />,
    )
    expect(screen.getByText('SJ')).toBeInTheDocument()
  })

  it('renders anonymous icon when isAnonymous=true', () => {
    const { container } = render(
      <Avatar
        firstName="Anonymous"
        lastName="User"
        avatarUrl={null}
        isAnonymous={true}
      />,
    )
    // Anonymous avatar should have a gray background
    const avatar = container.firstElementChild as HTMLElement
    expect(avatar).toHaveClass('bg-gray-200')
    // Should not show initials
    expect(screen.queryByText('AU')).not.toBeInTheDocument()
  })

  it('renders image when avatarUrl is provided', () => {
    const { container } = render(
      <Avatar
        firstName="Sarah"
        lastName="Johnson"
        avatarUrl="https://example.com/photo.jpg"
        userId="user-1"
      />,
    )
    const img = container.querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg')
    expect(img).toHaveAttribute('alt', '')
  })

  it('falls back to initials on image error', () => {
    const { container } = render(
      <Avatar
        firstName="Sarah"
        lastName="Johnson"
        avatarUrl="https://example.com/broken.jpg"
        userId="user-1"
      />,
    )
    const img = container.querySelector('img') as HTMLImageElement
    fireEvent.error(img)
    expect(screen.getByText('SJ')).toBeInTheDocument()
  })

  it('applies correct size classes for sm', () => {
    const { container } = render(
      <Avatar firstName="Sarah" lastName="Johnson" avatarUrl={null} size="sm" userId="user-1" />,
    )
    const avatar = container.firstElementChild as HTMLElement
    expect(avatar).toHaveClass('h-8', 'w-8')
  })

  it('applies correct size classes for lg', () => {
    const { container } = render(
      <Avatar firstName="Sarah" lastName="Johnson" avatarUrl={null} size="lg" userId="user-1" />,
    )
    const avatar = container.firstElementChild as HTMLElement
    expect(avatar).toHaveClass('h-16', 'w-16')
  })

  it('applies deterministic background color based on userId', () => {
    const { container: c1 } = render(
      <Avatar firstName="Sarah" lastName="Johnson" avatarUrl={null} userId="user-1" />,
    )
    const { container: c2 } = render(
      <Avatar firstName="Sarah" lastName="Johnson" avatarUrl={null} userId="user-1" />,
    )
    const bg1 = (c1.firstElementChild as HTMLElement).style.backgroundColor
    const bg2 = (c2.firstElementChild as HTMLElement).style.backgroundColor
    expect(bg1).toBe(bg2)
  })
})
