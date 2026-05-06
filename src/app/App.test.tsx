import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('shows loading state before fetch resolves', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    render(<App />)
    expect(screen.getByTestId('greeting')).toHaveTextContent('Cargando...')
  })

  it('renders greeting returned by the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ message: 'Bienvenido a Acequia Nueva' }),
        } as Response)
      )
    )
    render(<App />)
    await waitFor(() =>
      expect(screen.getByTestId('greeting')).toHaveTextContent(
        'Bienvenido a Acequia Nueva'
      )
    )
  })

  it('shows error message when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Network error'))))
    render(<App />)
    await waitFor(() =>
      expect(screen.getByTestId('greeting')).toHaveTextContent(
        'Error al cargar el saludo'
      )
    )
  })
})
