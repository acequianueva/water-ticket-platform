import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

function setLocation(pathname: string, search = '') {
  Object.defineProperty(window, 'location', {
    writable: true,
    configurable: true,
    value: { pathname, search, href: `http://localhost${pathname}${search}` },
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
  setLocation('/')
})

describe('App routing', () => {
  it('renders the buy page at the root path', () => {
    render(<App />)
    expect(screen.getByText('Buy water hours')).toBeInTheDocument()
  })

  it('renders the confirmation page at /confirmacion', () => {
    setLocation('/confirmacion', '?order=20260506TEST')
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {}))) // pending — shows loading text
    render(<App />)
    expect(screen.getByText('Confirming payment…')).toBeInTheDocument()
  })

  it('shows a payment error passed via query param', () => {
    setLocation('/', '?error=payment_failed')
    render(<App />)
    expect(screen.getByText('payment_failed')).toBeInTheDocument()
  })
})

describe('BuyPage', () => {
  it('shows a pay button with the correct amount for the default 1 hour', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /Pay €12\.00/ })).toBeInTheDocument()
  })

  it('shows an error banner when the API call fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network error'))),
    )
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Pay/ }))
    await waitFor(() =>
      expect(screen.getByText(/Failed to connect to the payment server/)).toBeInTheDocument(),
    )
  })
})

describe('ConfirmacionPage', () => {
  it('shows the voucher after a successful API poll', async () => {
    setLocation('/confirmacion', '?order=20260506ABCD')
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              found: true,
              purchase: {
                name: 'Federico Test',
                hours: 3,
                amount_eur: 36,
                voucher_code: 'ACE-20260506-ABC123',
                created_at: '2026-05-06T10:00:00Z',
              },
            }),
        } as Response),
      ),
    )
    render(<App />)
    await waitFor(() =>
      expect(screen.getByText('ACE-20260506-ABC123')).toBeInTheDocument(),
    )
    expect(screen.getByText('Federico Test')).toBeInTheDocument()
    expect(screen.getByText('3 h')).toBeInTheDocument()
  })

  it('shows an error when no order is in the URL', () => {
    setLocation('/confirmacion', '')
    render(<App />)
    expect(screen.getByText(/Order number not found/)).toBeInTheDocument()
  })
})
