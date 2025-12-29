/**
 * Tests para el componente Button
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../Button'

describe('Button', () => {
  it('debe renderizar el texto del botón', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('debe ejecutar onClick cuando se hace click', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    await user.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('debe estar deshabilitado cuando disabled es true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button', { name: /disabled/i })).toBeDisabled()
  })

  it('debe mostrar el estado de carga', () => {
    render(<Button isLoading>Loading</Button>)
    const button = screen.getByRole('button', { name: /loading/i })
    expect(button).toBeInTheDocument()
    // El botón debería estar deshabilitado cuando está cargando
    expect(button).toBeDisabled()
  })

  it('debe renderizar con diferentes variantes', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>)
    expect(screen.getByRole('button', { name: /primary/i })).toBeInTheDocument()

    rerender(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button', { name: /secondary/i })).toBeInTheDocument()

    rerender(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button', { name: /danger/i })).toBeInTheDocument()
  })
})

