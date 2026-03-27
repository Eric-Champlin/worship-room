import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormField } from '../FormField'

describe('FormField', () => {
  it('renders label and child input', () => {
    render(
      <FormField label="Email">
        <input type="email" />
      </FormField>,
    )
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('applies sr-only class to label when srOnly=true', () => {
    render(
      <FormField label="Hidden Label" srOnly>
        <input type="text" />
      </FormField>,
    )
    const label = screen.getByText('Hidden Label')
    expect(label.closest('label')).toHaveClass('sr-only')
  })

  it('renders required asterisk when required=true', () => {
    render(
      <FormField label="Name" required>
        <input type="text" />
      </FormField>,
    )
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('includes sr-only "required" text for screen readers', () => {
    render(
      <FormField label="Name" required>
        <input type="text" />
      </FormField>,
    )
    expect(screen.getByText('required')).toHaveClass('sr-only')
  })

  it('renders error message with AlertCircle icon', () => {
    render(
      <FormField label="Email" error="Invalid email">
        <input type="email" />
      </FormField>,
    )
    expect(screen.getByText('Invalid email')).toBeInTheDocument()
    // AlertCircle renders as an SVG
    const errorP = screen.getByText('Invalid email').closest('p')
    expect(errorP?.querySelector('svg')).toBeInTheDocument()
  })

  it('error element has role=alert', () => {
    render(
      <FormField label="Email" error="Required">
        <input type="email" />
      </FormField>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Required')
  })

  it('injects aria-invalid on child when error present', () => {
    render(
      <FormField label="Email" error="Required">
        <input type="email" />
      </FormField>,
    )
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('does not inject aria-invalid when no error', () => {
    render(
      <FormField label="Email">
        <input type="email" />
      </FormField>,
    )
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid')
  })

  it('connects aria-describedby to error element', () => {
    render(
      <FormField label="Email" error="Required">
        <input type="email" />
      </FormField>,
    )
    const input = screen.getByLabelText('Email')
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    const errorEl = screen.getByRole('alert')
    expect(describedBy).toContain(errorEl.id)
  })

  it('connects aria-describedby to help text element', () => {
    render(
      <FormField label="Name" helpText="Enter your full name">
        <input type="text" />
      </FormField>,
    )
    const input = screen.getByLabelText('Name')
    const describedBy = input.getAttribute('aria-describedby')
    const helpEl = screen.getByText('Enter your full name')
    expect(describedBy).toContain(helpEl.id)
  })

  it('renders CharacterCount when charCount and charMax provided', () => {
    render(
      <FormField label="Bio" charCount={50} charMax={200}>
        <textarea />
      </FormField>,
    )
    expect(screen.getByText('50 / 200')).toBeInTheDocument()
  })

  it('renders help text', () => {
    render(
      <FormField label="Name" helpText="Your display name">
        <input type="text" />
      </FormField>,
    )
    expect(screen.getByText('Your display name')).toBeInTheDocument()
  })
})
