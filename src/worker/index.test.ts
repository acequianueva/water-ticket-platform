import { describe, expect, it } from 'vitest'
import { app } from './index'

describe('GET /api/hello', () => {
  it('returns 200 with a greeting', async () => {
    const res = await app.request('http://localhost/api/hello')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { message: string }
    expect(body.message).toBe('Bienvenido a Acequia Nueva')
  })

  it('includes CORS header', async () => {
    const res = await app.request('http://localhost/api/hello', {
      headers: { Origin: 'http://localhost:5173' },
    })
    expect(res.headers.get('access-control-allow-origin')).toBeTruthy()
  })
})
